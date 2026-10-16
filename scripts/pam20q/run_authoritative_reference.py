#!/usr/bin/env python3
"""Run the complete authoritative Pam20Q reference evaluation locally, without AI.

Requires the accepted Pam SQLite baseline. Produces the 452-concept reconciliation,
authoritative public-target mapping/disagreements, and seeded uint8 build report.
This script never passes --run-ai.
"""
from __future__ import annotations
import argparse
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DEFAULT_DB=Path('/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite')
WORK=ROOT/'.dev-data/pam20q'


def run(*args):
    print('+', *map(str,args), flush=True)
    subprocess.run([str(x) for x in args], cwd=ROOT, check=True)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--database',type=Path,default=DEFAULT_DB)
    a=p.parse_args()
    if not a.database.is_file(): p.error(f'missing authoritative SQLite: {a.database}')
    py=sys.executable
    run(py,'scripts/pam20q/build_final_questions.py')
    run(py,'scripts/pam20q/reconcile_inventory.py','--database',a.database)
    if not (ROOT/'data/pam20q/reference/david-ar-20q/provenance.json').exists():
        run(py,'scripts/pam20q/import_david_ar_20q.py')
    run(py,'scripts/pam20q/export-runtime-evidence.py')
    run(py,'scripts/pam20q/evaluate_public_reference.py',
        '--database',a.database,
        '--existing-evidence',WORK/'existing-runtime-evidence.csv',
        '--out',WORK/'authoritative-public-reference-evaluation')
    run(py,'scripts/pam20q/build.py',
        '--source-db',a.database,
        '--external',WORK/'existing-runtime-evidence.csv',
        '--skip-ai','--reset')
    print('\nAuthoritative no-AI evaluation complete.')
    print('Inventory reconciliation:',WORK/'inventory-reconciliation/summary.json')
    print('452-row report:',WORK/'inventory-reconciliation/missing-concepts.csv')
    print('Public reference evaluation:',WORK/'authoritative-public-reference-evaluation/summary.json')
    print('Seeded build report:',WORK/'report.json')

if __name__=='__main__': main()
