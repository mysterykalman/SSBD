#!/usr/bin/env python3
"""Evaluate the pinned david-ar/20q reference against Pam20Q.

This script performs no AI calls. It classifies every public question, conservatively
maps public targets to Pam identities, compares overlapping known evidence, and
benchmarks the public four-state matrix encoded as Pam uint8 vs packed 2-bit states.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import math
import re
import sqlite3
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "data/pam20q/reference/david-ar-20q"
FINAL_Q = ROOT / "data/pam20q/final-canonical-questions.json"
FALLBACK = ROOT / "docs/pam-knowledge-fill/all-concepts.csv"
OUT = ROOT / ".dev-data/pam20q/public-reference-evaluation"

# Public question -> (classification, Pam question id, note)
DIRECT = {
    "Is it classified as Animal": ("semantic equivalent", "animal", "same broad animal split"),
    "Do you hold it when you use it": ("semantic equivalent", "handheld", "ordinary handheld use"),
    "Is it a common household object": ("partial overlap", "home", "Pam asks location, public asks household-object status"),
    "Is it round": ("exact equivalent", "round", "same question"),
    "Does it break if dropped": ("semantic equivalent", "fragile", "operational form of fragility"),
    "Does it open": ("partial overlap", "opens_closes", "Pam asks open-and-close behaviour"),
    "Is it fragile": ("exact equivalent", "fragile", "same question"),
    "Is it soft": ("exact equivalent", "soft", "same physical trait"),
    "Is it dangerous": ("semantic equivalent", "dangerous", "Pam frames danger as ability to hurt a person"),
    "Does it make noise": ("semantic equivalent", "sound", "same sound-producing behaviour"),
    "Is it electronic": ("exact equivalent", "electronic", "same trait"),
    "Is it manufactured": ("semantic equivalent", "manmade", "same human-made distinction"),
    "Is it cold": ("semantic equivalent", "cold", "Pam contextualizes served/used cold"),
    "Does it produce light": ("semantic equivalent", "light", "same light-emission trait"),
    "Is it a tool": ("exact equivalent", "tool", "same question"),
    "Does it have legs": ("semantic equivalent", "legs", "same trait"),
    "Is it hot": ("semantic equivalent", "hot", "Pam contextualizes served/used hot"),
    "Do you wear it": ("semantic equivalent", "clothing", "same wearable split"),
    "Can you eat it": ("exact equivalent", "edible", "same question"),
    "Does it taste sweet": ("semantic equivalent", "sweet", "same ordinary sweetness judgment"),
    "Can it swim": ("semantic equivalent", "swims", "same swimming behaviour"),
    "Does it communicate": ("partial overlap", "communication", "Pam asks primary use for communication"),
    "Is it alive": ("exact equivalent", "living", "same question"),
    "Is it an abstract concept": ("semantic equivalent", "abstract", "same domain split"),
    "Is it furry": ("semantic equivalent", "fur_hair", "same fur/hair trait"),
    "Is it an insect": ("exact equivalent", "insect", "same question"),
    "Is it a mammal": ("exact equivalent", "mammal", "same question"),
    "Is it a type of fish": ("semantic equivalent", "fish", "same fish subtype"),
    "Is it used for transportation": ("partial overlap", "vehicle", "transport use is broader than vehicle identity"),
    "Is it a farm animal": ("partial overlap", "domesticated", "farm animal is a narrower domestication signal"),
    "Is it a root vegetable": ("partial overlap", "vegetable_food", "narrow subtype of Pam's common-use vegetable question"),
}

ADDITIONS = {
    "Is it flat": "flat",
    "Is it heavy": "heavy",
    "Does it have buttons": "buttons_controls",
    "Does it have lights on it": "buttons_controls",  # useful control/device signal; not imported as direct evidence below
    "Do you carry it in your pocket": "pocket_sized",
    "Can it float": "floats",
    "Does it store information": "stores_information",
    "Can you see through it": "transparent",
    "Is it sharp": "sharp",
    "Is it mechanical": "mechanical",
    "Can you recycle it": "recyclable",
    "Does it live in water": "lives_in_water",
    "Is it a body part": "body_part",
    "Is it motorized": "motorized",
    "Does it lay eggs": "lays_eggs",
    "Does it have leaves": "leaves",
    "Does it have roots": "roots",
    "Does it have a shell": "shell",
    "Does it have feathers": "feathers",
    "Does it have wings": "wings",
}

# Only these public additions are direct enough to seed a cell without semantic distortion.
SEEDABLE_ADDITIONS = {
    "Is it flat", "Is it heavy", "Does it have buttons", "Do you carry it in your pocket",
    "Can it float", "Does it store information", "Can you see through it", "Is it sharp",
    "Is it mechanical", "Can you recycle it", "Does it live in water", "Is it a body part",
    "Is it motorized", "Does it lay eggs", "Does it have leaves", "Does it have roots",
    "Does it have a shell", "Does it have feathers", "Does it have wings",
}

PARTIAL = {
    "Is it classified as Vegetable": ("vegetable_food", "public AVM Vegetable does not equal culinary vegetable"),
    "Is it classified as Mineral": ("object", "AVM mineral is an old 20Q ontology, broader than material/object"),
    "Is it classified as Other": ("object", "residual AVM class is not a stable Pam domain"),
    "Is it smaller than a loaf of bread": ("handheld", "size proxy only"),
    "Is it larger than a pound of butter": ("larger_than_person", "size direction overlaps but threshold differs"),
    "Is it smaller than a golf ball": ("pocket_sized", "narrower size threshold"),
    "Is it larger than a bread box (or microwave oven)": ("larger_than_person", "different size threshold"),
    "Can you lift it": ("heavy", "inverse/related rather than equivalent"),
    "Does it weigh more than a duck": ("heavy", "culture-specific size/weight proxy"),
    "Is it very large": ("larger_than_person", "subjective size proxy"),
    "Is it bigger than a sofa": ("larger_than_person", "different threshold"),
    "Can it carry people": ("vehicle", "strong vehicle clue but not identity"),
    "Can it be placed on your head": ("clothing", "broader than headwear and can include non-wearables"),
    "Can you wear it on your head": ("clothing", "headwear subtype"),
    "Is it used in a game": ("toy", "game use is broader than toy identity"),
    "Does it live in salt-water": ("lives_in_water", "salt-water subtype"),
    "Is it a rodent": ("mammal", "narrow mammal subtype"),
    "Is it warm blooded": ("animal", "animal physiology split, correlated with mammal/bird"),
    "Is it a herbivore": ("animal", "dietary animal subtype"),
    "Does it have a spine": ("animal", "vertebrate split"),
    "Is it cold blooded": ("animal", "physiology split, inverse-correlated with mammal/bird"),
    "Is it a scavenger": ("animal", "behavioural subtype"),
    "Is it a type of dog": ("mammal", "too narrow for a canonical question"),
    "Is it a carnivore": ("animal", "dietary animal subtype"),
}

REDUNDANT_PATTERNS = [
    r"^Is it (white|black|brown|red|green|yellow|colorless|colorful|a specific color)$",
    r"^Does it (have a good smell|smell sweet)$",
    r"^Is it (tasty|cool|warm|crunchy|fluffy|striped|spotted|slippery)$",
    r"^Does it (have a long tail|have tough skin|have paws|have feet|have hooves|have a trunk)$",
    r"^Can it (climb|jump|hop|growl|use tools)$",
    r"^Is it (a nocturnal animal|a vegetarian|organic|a scavenger)$",
]

POOR_PATTERNS = [
    r"bring joy|Do you love it|lost without|Would you like to be one|need love|10-foot pole",
    r"Have you seen one in real life|Do you know any songs about it|Is it annoying|Is it useful",
    r"Was it used over 100 years ago|Was it invented|Is it spontaneous|Is it delivered",
    r"Can you buy it|Does it come in a box|Does it come in specific sizes",
]

CURATED_TARGET_ALIASES = {
    "sun glasses": "sunglasses",
    "tooth brush": "toothbrush",
    "tooth paste": "toothpaste",
    "web site": "website",
    "web cam": "webcam",
    "tea pot": "teapot",
    "tea cup": "teacup",
    "mini van": "minivan",
    "snow board": "snowboard",
    "shoe lace": "shoelace",
    "key chain": "keychain",
    "hard disk": "hard drive",
    "soft drink": "soda",
    "pair of glasses": "glasses",
    "pair of sneakers": "sneakers",
    "pair of socks": "socks",
}

STATE_TO_P = {0: 0.25, 1: 0.75, 2: 0.02, 3: 0.98}


def basic(text):
    return " ".join(str(text or "").strip().casefold().split())


def normalized_name(text):
    s = basic(text)
    s = re.sub(r"^(?:a|an|the)\s+", "", s)
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s)
    s = s.replace("-", " ")
    s = re.sub(r"[^\w\s']+", " ", s, flags=re.UNICODE)
    return " ".join(s.split())


def classify(question):
    if question in DIRECT:
        c, qid, note = DIRECT[question]
        return c, qid, note, c in {"exact equivalent", "semantic equivalent"}
    if question in ADDITIONS:
        return "genuinely useful new question", ADDITIONS[question], "adds a broad classic-20Q split missing from Pam", question in SEEDABLE_ADDITIONS
    if question in PARTIAL:
        qid, note = PARTIAL[question]
        return "partial overlap", qid, note, False
    for pat in REDUNDANT_PATTERNS:
        if re.search(pat, question, flags=re.I):
            return "redundant", "", "too narrow, highly correlated, or low incremental information across Pam's universe", False
    for pat in POOR_PATTERNS:
        if re.search(pat, question, flags=re.I):
            return "poor fit for Pam's broader concept universe", "", "subjective, culturally dated, purchase-dependent, or weakly defined", False
    return "poor fit for Pam's broader concept universe", "", "useful in an object-only classic game but not stable enough across people, places, media, events, organizations, and abstract concepts", False


def load_inventory_csv(path):
    rows=[]
    with path.open(newline="",encoding="utf-8-sig") as fh:
        for i,r in enumerate(csv.DictReader(fh),1):
            cid=str(r.get("concept_id") or r.get("id") or r.get("key") or "").strip()
            name=str(r.get("name") or r.get("concept") or r.get("label") or cid).strip()
            aliases=[]
            raw=str(r.get("aliases") or r.get("alias") or "").strip()
            if raw:
                try:
                    value=json.loads(raw); aliases=[str(x) for x in value] if isinstance(value,list) else []
                except Exception:
                    aliases=[x.strip() for x in re.split(r"[|;]",raw) if x.strip()]
            rows.append({"concept_id":cid or f"fallback:{i}","name":name,"aliases":aliases})
    return rows


def load_inventory_sqlite(path):
    con=sqlite3.connect(f"file:{path}?mode=ro",uri=True); con.row_factory=sqlite3.Row
    rows=[{"concept_id":str(r["concept_id"]),"name":str(r["name"]),"aliases":[]} for r in con.execute("SELECT concept_id,name FROM concepts ORDER BY row_id")]
    con.close(); return rows


def map_targets(targets, inventory):
    exact=defaultdict(list); normalized=defaultdict(list); aliases=defaultdict(list)
    for r in inventory:
        exact[basic(r["name"])].append(r)
        normalized[normalized_name(r["name"])].append(r)
        for a in r.get("aliases",[]): aliases[normalized_name(a)].append(r)
    out=[]
    for idx,t in enumerate(targets):
        key=basic(t); n=normalized_name(t); candidates=exact.get(key,[])
        kind="exact" if len(candidates)==1 else ""
        if not kind:
            alias_key=CURATED_TARGET_ALIASES.get(n)
            pool=[]
            if alias_key: pool=normalized.get(normalized_name(alias_key),[])
            if len(pool)==1: candidates=pool; kind="safe_alias"
        if not kind:
            pool=normalized.get(n,[])
            if len(pool)==1: candidates=pool; kind="safe_normalized"
            elif len(pool)>1: candidates=pool; kind="ambiguous"
        if not kind:
            pool=aliases.get(n,[])
            unique={x["concept_id"]:x for x in pool}
            if len(unique)==1: candidates=list(unique.values()); kind="safe_alias"
            elif len(unique)>1: candidates=list(unique.values()); kind="ambiguous"
        if not kind: candidates=[]; kind="unmatched"
        out.append({"public_index":idx,"public_target":t,"match_kind":kind,"pam_matches":[{"concept_id":x["concept_id"],"name":x["name"]} for x in candidates]})
    return out


def pack_2bit(weights):
    out=bytearray((len(weights)+3)//4)
    for i,w in enumerate(weights): out[i//4]|=(int(w)&3)<<((i%4)*2)
    return bytes(out)


def uint8_projection(weights):
    return bytes(round(STATE_TO_P[int(w)]*254) for w in weights)


def benchmark(weights, nq, nt, max_turns=25):
    # Candidate-set benchmark using identical relationship knowledge. Question selection
    # maximizes the entropy of the yes/no split; the target's public state supplies the answer.
    yes_masks=[]
    for q in range(nq):
        mask=0; off=q*nt
        for t in range(nt):
            if weights[off+t]&1: mask|=1<<t
        yes_masks.append(mask)
    all_mask=(1<<nt)-1
    turns=[]; first_choices=[]
    for target in range(nt):
        candidates=all_mask; asked=set(); success=None; chosen=[]
        target_bit=1<<target
        for turn in range(1,max_turns+1):
            n=candidates.bit_count()
            if n<=1:
                success=turn-1; break
            best_q=-1; best_gain=-1.0
            for q in range(4,nq):
                if q in asked: continue
                y=(candidates & yes_masks[q]).bit_count(); no=n-y
                if y==0 or no==0: gain=0.0
                else:
                    py=y/n; pn=no/n
                    gain=-(py*math.log2(py)+pn*math.log2(pn))
                if gain>best_gain+1e-12:
                    best_gain=gain; best_q=q
            if best_q<0: break
            asked.add(best_q); chosen.append(best_q)
            if target_bit & yes_masks[best_q]: candidates &= yes_masks[best_q]
            else: candidates &= all_mask ^ yes_masks[best_q]
            if candidates==target_bit:
                success=turn; break
        if success is not None: turns.append(success)
        first_choices.append(chosen[:max_turns])
    wins20=sum(1 for x in turns if x<=20); wins25=sum(1 for x in turns if x<=25)
    return {"targets":nt,"wins_20":wins20,"win_rate_20":wins20/nt,"wins_25":wins25,"win_rate_25":wins25/nt,"median_successful_turn":sorted(turns)[len(turns)//2] if turns else None,"average_successful_turn":sum(turns)/len(turns) if turns else None,"stumped_rate_25":1-wins25/nt,"paths":first_choices}


def load_existing_evidence(path):
    if not path or not path.exists(): return {}
    out={}
    with path.open(newline="",encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            try:p=float(r["probability"])
            except Exception:continue
            out[(basic(r.get("concept") or r.get("name")),r.get("question_id",""))]=(p,r.get("source",""))
    return out


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reference",type=Path,default=REF)
    p.add_argument("--questions",type=Path,default=FINAL_Q)
    p.add_argument("--inventory",type=Path,default=FALLBACK)
    p.add_argument("--database",type=Path)
    p.add_argument("--existing-evidence",type=Path)
    p.add_argument("--out",type=Path,default=OUT)
    a=p.parse_args(); a.out.mkdir(parents=True,exist_ok=True)
    pub_q=json.loads((a.reference/"questions.json").read_text())["questions"]
    targets=json.loads((a.reference/"targets.json").read_text())["targets"]
    weights=(a.reference/"weights.u2states.bin").read_bytes()
    pam_q=json.loads(a.questions.read_text())["questions"]; pam_ids={q["id"] for q in pam_q}
    if len(pub_q)!=156 or len(targets)!=1200 or len(weights)!=156*1200: raise SystemExit("reference dimensions changed")

    classified=[]
    for i,q in enumerate(pub_q):
        cls,qid,note,seedable=classify(q)
        if qid and qid not in pam_ids and cls!="partial overlap": raise SystemExit(f"mapped Pam question missing: {qid}")
        classified.append({"public_index":i,"public_question":q,"classification":cls,"pam_question_id":qid,"seedable":seedable,"note":note})
    with (a.out/"question-comparison.csv").open("w",newline="",encoding="utf-8") as fh:
        w=csv.DictWriter(fh,fieldnames=classified[0].keys()); w.writeheader(); w.writerows(classified)

    inventory=load_inventory_sqlite(a.database) if a.database else load_inventory_csv(a.inventory)
    mapped=map_targets(targets,inventory)
    (a.out/"target-mapping.json").write_text(json.dumps(mapped,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    with (a.out/"target-mapping.csv").open("w",newline="",encoding="utf-8") as fh:
        fields=["public_index","public_target","match_kind","pam_matches"]
        w=csv.DictWriter(fh,fieldnames=fields); w.writeheader()
        for r in mapped:w.writerow({**r,"pam_matches":json.dumps(r["pam_matches"],ensure_ascii=False,separators=(",",":"))})

    existing=load_existing_evidence(a.existing_evidence)
    seed_questions=[r for r in classified if r["seedable"] and r["pam_question_id"]]
    disagreements=[]; imported_cells=0
    safe_kinds={"exact","safe_alias","safe_normalized"}
    for m in mapped:
        if m["match_kind"] not in safe_kinds or len(m["pam_matches"])!=1: continue
        target_name=m["pam_matches"][0]["name"]; t=m["public_index"]
        for qm in seed_questions:
            state=weights[qm["public_index"]*len(targets)+t]; pp=STATE_TO_P[state]; imported_cells+=1
            old=existing.get((basic(target_name),qm["pam_question_id"]))
            if old and abs(old[0]-pp)>=0.40:
                disagreements.append({"concept":target_name,"public_target":m["public_target"],"question_id":qm["pam_question_id"],"public_question":qm["public_question"],"pam_probability":old[0],"pam_source":old[1],"public_state":int(state),"public_probability":pp,"absolute_difference":round(abs(old[0]-pp),3)})
    with (a.out/"disagreements.csv").open("w",newline="",encoding="utf-8") as fh:
        fields=["concept","public_target","question_id","public_question","pam_probability","pam_source","public_state","public_probability","absolute_difference"]
        w=csv.DictWriter(fh,fieldnames=fields); w.writeheader(); w.writerows(disagreements)

    u8=uint8_projection(weights); packed=pack_2bit(weights)
    u8gz=gzip.compress(u8,compresslevel=9,mtime=0); p2gz=gzip.compress(packed,compresslevel=9,mtime=0)
    bench_u8=benchmark(weights,len(pub_q),len(targets)); bench_2=benchmark(weights,len(pub_q),len(targets))
    disagreement_paths=sum(1 for a1,a2 in zip(bench_u8["paths"],bench_2["paths"]) if a1!=a2)
    for b in (bench_u8,bench_2): b.pop("paths",None)

    counts=defaultdict(int)
    for r in classified:counts[r["classification"]]+=1
    match_counts=defaultdict(int)
    for r in mapped:match_counts[r["match_kind"]]+=1
    pam_without_public=[q["id"] for q in pam_q if q["id"] not in {r["pam_question_id"] for r in classified if r["pam_question_id"]}]
    total_cells=53092*len(pam_q)
    summary={
        "pam_current_questions":131,
        "public_questions":len(pub_q),
        "question_classification_counts":dict(sorted(counts.items())),
        "overlaps":sum(counts[x] for x in ("exact equivalent","semantic equivalent","partial overlap")),
        "useful_public_additions":counts["genuinely useful new question"],
        "proposed_final_question_count":len(pam_q),
        "pam_questions_without_public_equivalent_count":len(pam_without_public),
        "pam_questions_without_public_equivalent":pam_without_public,
        "public_targets":len(targets),
        "target_mapping_counts":dict(sorted(match_counts.items())),
        "safely_mapped_public_targets":sum(match_counts[x] for x in safe_kinds),
        "public_matrix_cells_available_for_safe_seed":imported_cells,
        "public_pam_disagreements":len(disagreements),
        "reference_representation_benchmark":{
            "uint8":{**bench_u8,"raw_bytes":len(u8),"gzip_bytes":len(u8gz),"sha256":hashlib.sha256(u8).hexdigest()},
            "two_bit":{**bench_2,"raw_bytes":len(packed),"gzip_bytes":len(p2gz),"sha256":hashlib.sha256(packed).hexdigest()},
            "selected_question_path_disagreements":disagreement_paths,
            "note":"The public source contains only four states, so uint8 is a lossless expansion of the same four-state knowledge. This benchmark proves encoding fidelity but cannot measure information lost when quantizing future continuous AI probabilities."
        },
        "authoritative_pam_structural_sizes":{
            "concepts":53092,"questions":len(pam_q),"cells":total_cells,
            "uint8_matrix_bytes":total_cells,
            "two_bit_values_bytes":(total_cells+3)//4,
            "unknown_mask_bytes":(total_cells+7)//8,
            "two_bit_plus_unknown_mask_bytes":(total_cells+3)//4+(total_cells+7)//8,
        },
        "inventory_source":"authoritative SQLite" if a.database else "fallback CSV; rerun with --database for authoritative mapping",
    }
    (a.out/"summary.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps(summary,indent=2,ensure_ascii=False))

if __name__=="__main__":main()
