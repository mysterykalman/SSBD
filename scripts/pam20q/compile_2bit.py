#!/usr/bin/env python3
"""Compile the current Pam20Q build database to four states plus an unknown mask.

This is an evaluation artifact, not the selected production format. Continuous
probabilities are deterministically quantized as:
  [0.00,0.25) strong no
  [0.25,0.50) weak no
  [0.50,0.75) weak yes
  [0.75,1.00] strong yes
Unknown remains separate in a one-bit mask.
"""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import sqlite3
import struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'.dev-data/pam20q'


def state(p):
    p=float(p)
    if p < .25: return 2
    if p < .50: return 0
    if p < .75: return 1
    return 3


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--database',type=Path,default=WORK/'build.sqlite')
    ap.add_argument('--out',type=Path,default=WORK/'compiled')
    args=ap.parse_args()
    con=sqlite3.connect(args.database); con.row_factory=sqlite3.Row
    concepts=list(con.execute('SELECT concept_id FROM concepts ORDER BY rank,concept_id'))
    questions=list(con.execute('SELECT question_id FROM questions ORDER BY rowid'))
    ci={r['concept_id']:i for i,r in enumerate(concepts)}; qi={r['question_id']:i for i,r in enumerate(questions)}
    cells=len(concepts)*len(questions)
    packed=bytearray((cells+3)//4); known=bytearray((cells+7)//8)
    resolved=0
    for r in con.execute('SELECT concept_id,question_id,probability FROM cells'):
        if r['concept_id'] not in ci or r['question_id'] not in qi: continue
        idx=ci[r['concept_id']]*len(questions)+qi[r['question_id']]
        packed[idx//4] |= state(r['probability']) << ((idx%4)*2)
        known[idx//8] |= 1 << (idx%8)
        resolved+=1
    con.close()
    header=b'PAM2Q2B\0'+struct.pack('<II',len(concepts),len(questions))
    raw=header+struct.pack('<II',len(packed),len(known))+bytes(packed)+bytes(known)
    gz=gzip.compress(raw,compresslevel=9,mtime=0)
    args.out.mkdir(parents=True,exist_ok=True)
    out=args.out/'pam20q.v1.2bit.bin.gz'; out.write_bytes(gz)
    result={
        'format':'pam20q-2bit-plus-known-mask-gzip',
        'concept_count':len(concepts),'question_count':len(questions),'cells':cells,
        'resolved_cells':resolved,'unknown_cells':cells-resolved,
        'two_bit_value_bytes':len(packed),'known_mask_bytes':len(known),
        'raw_artifact_bytes':len(raw),'gzip_artifact_bytes':len(gz),
        'sha256':hashlib.sha256(gz).hexdigest(),
        'quantization':{'strong_no':'p < 0.25','weak_no':'0.25 <= p < 0.50','weak_yes':'0.50 <= p < 0.75','strong_yes':'p >= 0.75'},
    }
    (args.out/'pam20q.v1.2bit.report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,indent=2))

if __name__=='__main__': main()
