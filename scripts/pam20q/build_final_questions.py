#!/usr/bin/env python3
"""Build the recommended final Pam20Q question vocabulary.

Keeps the validated 131-question Pam set and adds only broad, human-friendly
classic-20Q dimensions that materially improve physical/common-sense splitting.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data/pam20q/canonical-questions.json"
OUT = ROOT / "data/pam20q/final-canonical-questions.json"

ADDITIONS = [
    {"id":"body_part","text":"Is it a part of a body?","group":"physical","parents":[]},
    {"id":"flat","text":"Is it usually flat?","group":"physical","parents":[]},
    {"id":"sharp","text":"Is it usually sharp?","group":"physical","parents":[]},
    {"id":"transparent","text":"Can you normally see through it?","group":"physical","parents":[]},
    {"id":"heavy","text":"Would most people describe it as heavy?","group":"physical","parents":[]},
    {"id":"pocket_sized","text":"Could it normally fit in a pocket?","group":"physical","parents":[]},
    {"id":"floats","text":"Can it normally float on water?","group":"ability","parents":[]},
    {"id":"mechanical","text":"Is it mainly mechanical?","group":"object","parents":["object"]},
    {"id":"motorized","text":"Does it normally have a motor or engine?","group":"object","parents":[]},
    {"id":"buttons_controls","text":"Does it normally have buttons or controls?","group":"physical","parents":[]},
    {"id":"stores_information","text":"Is it mainly used to store information?","group":"use","parents":[]},
    {"id":"recyclable","text":"Can it commonly be recycled?","group":"physical","parents":[]},
    {"id":"wings","text":"Does it normally have wings?","group":"animal","parents":[]},
    {"id":"feathers","text":"Does it normally have feathers?","group":"animal","parents":["bird"]},
    {"id":"lays_eggs","text":"Does it normally lay eggs?","group":"animal","parents":[]},
    {"id":"shell","text":"Does it normally have a shell?","group":"animal","parents":[]},
    {"id":"lives_in_water","text":"Does it normally live in water?","group":"animal","parents":[]},
    {"id":"leaves","text":"Does it normally have leaves?","group":"plant","parents":["plant"]},
    {"id":"roots","text":"Does it normally have roots?","group":"plant","parents":["plant"]},
]


def main():
    base = json.loads(BASE.read_text(encoding="utf-8"))
    questions = list(base["questions"])
    ids = {q["id"] for q in questions}
    for q in ADDITIONS:
        if q["id"] in ids:
            raise SystemExit(f"duplicate question id: {q['id']}")
        questions.append(q)
        ids.add(q["id"])
    if len(questions) != 150:
        raise SystemExit(f"expected 150 final questions, got {len(questions)}")
    out = {
        "version": 2,
        "description": "Final recommended Pam20Q vocabulary after classic david-ar/20q reference comparison. Human-behaviour probabilities, not strict encyclopedic truth.",
        "base_question_count": len(base["questions"]),
        "public_reference_additions": len(ADDITIONS),
        "questions": questions,
    }
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"base": len(base["questions"]), "added": len(ADDITIONS), "final": len(questions), "output": str(OUT)}, indent=2))


if __name__ == "__main__":
    main()
