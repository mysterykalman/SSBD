#!/usr/bin/env python3
"""Map offline ConceptNet evidence into Pam's controlled trait vocabulary.

Conservative mapper. Produces candidate evidence only. Never mutates SQLite or runtime.
"""
import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

TRAIT_RULES = {
    "IsA": [
        ("person", r"\b(person|human|people|individual|human being)\b"),
        ("animal", r"\b(animal|fauna|creature|vertebrate|invertebrate)\b"),
        ("mammal", r"\b(mammal|canine|feline|primate|rodent|cetacean|ungulate)\b"),
        ("bird", r"\b(bird|avian)\b"), ("fish", r"\bfish\b"),
        ("reptile", r"\breptile\b"), ("amphibian", r"\bamphibian\b"), ("insect", r"\binsect\b"),
        ("plant", r"\b(plant|flora|vegetation)\b"), ("tree", r"\btree\b"), ("flower", r"\bflower\b"),
        ("country", r"\b(country|sovereign state|nation state)\b"),
        ("city", r"\b(city|town|municipality)\b"),
        ("building", r"\b(building|edifice|architectural structure)\b"),
        ("landmark", r"\b(landmark|monument)\b"),
        ("mountain", r"\b(mountain|peak)\b"), ("park", r"\b(park|national park)\b"),
        ("water_place", r"\b(river|lake|ocean|sea|bay|waterfall|canal)\b"),
        ("vehicle", r"\b(vehicle|conveyance)\b"),
        ("car", r"\b(car|automobile|truck|pickup truck)\b"),
        ("aircraft", r"\b(aircraft|airplane|aeroplane|helicopter)\b"),
        ("watercraft", r"\b(boat|ship|watercraft|vessel)\b"),
        ("tool", r"\btool\b"), ("device", r"\b(device|equipment|machine|appliance)\b"),
        ("furniture", r"\bfurniture\b"), ("clothing", r"\b(clothing|garment|apparel|wearable)\b"),
        ("container", r"\b(container|receptacle)\b"), ("toy", r"\btoy\b"),
        ("musical_instrument", r"\bmusical instrument\b"), ("weapon", r"\bweapon\b"),
        ("food_drink", r"\b(food|beverage|drink|dish|ingredient|edible)\b"),
        ("drink", r"\b(beverage|drink)\b"), ("fruit_food", r"\bfruit\b"),
        ("vegetable_food", r"\bvegetable\b"), ("meat", r"\bmeat\b"),
        ("film", r"\b(film|movie|motion picture)\b"),
        ("tv_series", r"\b(television series|tv series|television program)\b"),
        ("book", r"\b(book|written work|literary work|publication)\b"),
        ("novel", r"\bnovel\b"), ("play", r"\b(play|theatrical work)\b"),
        ("song", r"\bsong\b"), ("album", r"\balbum\b"),
        ("video_game", r"\bvideo game\b"), ("painting", r"\bpainting\b"),
        ("sculpture", r"\bsculpture\b"),
        ("event", r"\b(event|occurrence|happening)\b"),
        ("war", r"\b(war|battle|military conflict|armed conflict)\b"),
        ("disaster", r"\b(disaster|catastrophe)\b"),
        ("organization", r"\b(organization|organisation|institution)\b"),
        ("company", r"\b(company|business|corporation|enterprise)\b"),
        ("brand", r"\bbrand\b"),
        ("sports_team", r"\b(sports team|football club|baseball team|hockey team|basketball team)\b"),
        ("abstract", r"\b(abstract concept|concept|idea|feeling|state|quality)\b"),
        ("emotion", r"\b(emotion|feeling)\b"),
    ],
    "MadeOf": [
        ("metal", r"\b(metal|steel|iron|aluminium|aluminum)\b"),
        ("wood", r"\b(wood|wooden|timber)\b"),
        ("plastic", r"\bplastic\b"), ("glass", r"\bglass\b"),
        ("paper", r"\b(paper|cardboard)\b"), ("fabric", r"\b(fabric|cloth|textile)\b"),
    ],
    "HasProperty": [
        ("round", r"\b(round|circular)\b"), ("soft", r"\bsoft\b"), ("sweet", r"\bsweet\b"),
    ],
    "AtLocation": [
        ("kitchen", r"\bkitchen\b"), ("bathroom", r"\b(bathroom|washroom)\b"),
        ("office_school", r"\b(office|school|classroom)\b"),
        ("outdoors", r"\b(outdoor|outside|garden|forest|road|street)\b"),
    ],
}

PARENTS = {
    "mammal":["animal"],"bird":["animal"],"fish":["animal"],"reptile":["animal"],"amphibian":["animal"],"insect":["animal"],
    "tree":["plant"],"flower":["plant"],"country":["place"],"city":["place"],"building":["place"],"landmark":["place"],
    "water_place":["place"],"mountain":["place"],"park":["place"],"car":["vehicle"],"aircraft":["vehicle"],"watercraft":["vehicle"],
    "vehicle":["object"],"tool":["object"],"device":["object"],"furniture":["object"],"clothing":["object"],"container":["object"],
    "toy":["object"],"musical_instrument":["object"],"weapon":["object"],"drink":["food_drink"],"fruit_food":["food_drink"],
    "vegetable_food":["food_drink"],"meat":["food_drink"],"film":["media_work"],"tv_series":["media_work"],"book":["media_work"],
    "novel":["book"],"play":["book"],"song":["media_work"],"album":["media_work"],"video_game":["media_work"],
    "painting":["media_work"],"sculpture":["media_work"],"war":["event"],"disaster":["event"],"company":["organization"],
    "brand":["organization"],"sports_team":["organization"],"emotion":["abstract"]
}

def norm(s):
    return re.sub(r"[_-]+", " ", str(s or "").strip().casefold())

def expand(trait):
    out, stack = {trait}, [trait]
    while stack:
        t = stack.pop()
        for p in PARENTS.get(t, []):
            if p not in out:
                out.add(p); stack.append(p)
    return out

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--parquet", default="/Volumes/Samsung_T5/Pam-Knowledge/conceptnet-extraction/conceptnet-evidence.parquet")
    p.add_argument("--output", default="/Volumes/Samsung_T5/Pam-Knowledge/conceptnet-traits")
    p.add_argument("--memory", default="4GB")
    p.add_argument("--threads", type=int, default=4)
    args = p.parse_args()
    import duckdb
    src, out = Path(args.parquet), Path(args.output)
    if not src.is_file(): p.error("Missing ConceptNet evidence parquet")
    out.mkdir(parents=True, exist_ok=True)
    db = duckdb.connect()
    db.execute(f"SET memory_limit='{args.memory}'")
    db.execute(f"SET threads={args.threads}")
    rows = db.execute("SELECT concept_row_id,relation,subject_term,object_term,subject,object FROM read_parquet(?) WHERE relation IN ('IsA','MadeOf','HasProperty','AtLocation')", [str(src)]).fetchall()
    candidates = {}
    unmapped = Counter()
    for cid, relation, subj, obj, subj_uri, obj_uri in rows:
        text = norm(obj)
        matched = False
        for trait, pattern in TRAIT_RULES.get(relation, []):
            if re.search(pattern, text):
                matched = True
                for derived in expand(trait):
                    key = (cid, derived)
                    rec = candidates.setdefault(key, {"concept_row_id":cid,"trait":derived,"evidence":[],"sources":set()})
                    rec["evidence"].append({"relation":relation,"object_term":obj,"object_uri":obj_uri})
                    rec["sources"].add("ConceptNet")
        if not matched:
            unmapped[relation] += 1
    output_rows = []
    for rec in candidates.values():
        output_rows.append({
            "concept_row_id":rec["concept_row_id"], "trait":rec["trait"],
            "source":"ConceptNet", "evidence_count":len(rec["evidence"]),
            "evidence_json":json.dumps(rec["evidence"], ensure_ascii=False, separators=(",",":"))
        })
    output_rows.sort(key=lambda r:(int(r["concept_row_id"]),r["trait"]))
    fields = ["concept_row_id","trait","source","evidence_count","evidence_json"]
    with (out / "conceptnet-trait-candidates.csv").open("w", newline="", encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(output_rows)
    summary = {
        "mode":"candidate-only", "input_edges":len(rows), "candidate_rows":len(output_rows),
        "concepts":len({r['concept_row_id'] for r in output_rows}),
        "traits":dict(Counter(r['trait'] for r in output_rows)),
        "unmapped_edges":dict(unmapped), "sqlite_modified":False, "runtime_modified":False,
        "output":str(out)
    }
    (out / "summary.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(summary,indent=2))
    db.close()

if __name__ == '__main__':
    main()
