#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
EVAL=ROOT/'.dev-data/pam20q/public-reference-evaluation/summary.json'
BUILD=ROOT/'.dev-data/pam20q/report.json'
PROV=ROOT/'data/pam20q/reference/david-ar-20q/provenance.json'
OUT=ROOT/'docs/pam20q-public-reference-report.md'


def pct(x): return f"{100*x:.1f}%"

def main():
    ev=json.loads(EVAL.read_text())
    build=json.loads(BUILD.read_text())
    prov=json.loads(PROV.read_text())
    qc=ev['question_classification_counts']; mc=ev['target_mapping_counts']; rb=ev['reference_representation_benchmark']
    fallback_total=build['total_concept_question_cells']; fallback_unknown=build['unresolved_cells']
    unknown_rate=fallback_unknown/fallback_total if fallback_total else 1
    auth_cells=53092*ev['proposed_final_question_count']
    estimated_auth_unknown=round(auth_cells*unknown_rate)
    lines=[
        '# Pam20Q classic public-reference evaluation','',
        '## Status','',
        'The classic public model has been imported as pinned build-time reference data. No production gameplay files depend on Hugging Face, and AI enrichment was not run.','',
        'The authoritative Pam SQLite baseline remains `/Volumes/Samsung_T5/Pam-Knowledge/baseline/pam-films-v6.sqlite` with 53,092 concepts. That file is intentionally outside GitHub, so the checked-in remote validation cannot enumerate the 452 SQLite-only identities. `scripts/pam20q/reconcile_inventory.py` produces the required deterministic 452-row explanation on the machine that has the baseline.','',
        '## Public reference','',
        f"- Source: `david-ar/20q` at revision `{prov['revision']}`",
        f"- Public questions: {prov['question_count']}",
        f"- Public targets: {prov['target_count']}",
        f"- Matrix cells: {prov['matrix_cells']:,}",
        f"- Published model SHA-256: `{prov['model_sha256']}`",
        f"- Imported weight SHA-256: `{prov['derived_weights_sha256']}`",
        '- Four states: weak no, weak yes, strong no, strong yes; Pam keeps unknown separate.','',
        '## Question vocabulary','',
        '- Current Pam questions: 131',
        f"- Public questions: {ev['public_questions']}",
        f"- Exact equivalents: {qc.get('exact equivalent',0)}",
        f"- Semantic equivalents: {qc.get('semantic equivalent',0)}",
        f"- Partial overlaps: {qc.get('partial overlap',0)}",
        f"- Genuinely useful public additions: {qc.get('genuinely useful new question',0)}",
        f"- Redundant public questions: {qc.get('redundant',0)}",
        f"- Poor-fit public questions: {qc.get("poor fit for Pam's broader concept universe",0)}",
        f"- Proposed final Pam vocabulary: {ev['proposed_final_question_count']}",
        f"- Pam questions retained without a useful public equivalent: {ev['pam_questions_without_public_equivalent_count']}",'',
        'The final vocabulary keeps Pam’s named-entity/media questions and adds only broad classic physical/common-sense splits. The complete 156-row classification is in `docs/pam20q-public-reference/question-comparison.csv`.','',
        '## Public target mapping','',
        f"- Exact matches: {mc.get('exact',0)}",
        f"- Safe normalized matches: {mc.get('safe_normalized',0)}",
        f"- Safe alias matches: {mc.get('safe_alias',0)}",
        f"- Ambiguous matches: {mc.get('ambiguous',0)}",
        f"- Unmatched targets: {mc.get('unmatched',0)}",
        f"- Safely mapped targets: {ev['safely_mapped_public_targets']}",
        f"- Public matrix cells available as seed evidence on this fallback-inventory validation: {ev['public_matrix_cells_available_for_safe_seed']:,}",
        f"- Public/Pam disagreements found against existing runtime evidence: {ev['public_pam_disagreements']}",'',
        'These mapping counts are conservative and are regenerated against the 53,092-concept SQLite inventory when the local reconciliation command is run. Distinct concept IDs/QIDs are never merged solely because names normalize to the same text.','',
        '## Representation benchmark','',
        f"- uint8 reference artifact: {rb['uint8']['raw_bytes']:,} raw bytes, {rb['uint8']['gzip_bytes']:,} gzip bytes",
        f"- 2-bit reference artifact: {rb['two_bit']['raw_bytes']:,} raw bytes, {rb['two_bit']['gzip_bytes']:,} gzip bytes",
        f"- 20-question win rate, uint8: {pct(rb['uint8']['win_rate_20'])}",
        f"- 20-question win rate, 2-bit: {pct(rb['two_bit']['win_rate_20'])}",
        f"- 25-question win rate, uint8: {pct(rb['uint8']['win_rate_25'])}",
        f"- 25-question win rate, 2-bit: {pct(rb['two_bit']['win_rate_25'])}",
        f"- Median successful turn, uint8 / 2-bit: {rb['uint8']['median_successful_turn']} / {rb['two_bit']['median_successful_turn']}",
        f"- Average successful turn, uint8 / 2-bit: {rb['uint8']['average_successful_turn']:.2f} / {rb['two_bit']['average_successful_turn']:.2f}",
        f"- Stumped rate at 25, uint8 / 2-bit: {pct(rb['uint8']['stumped_rate_25'])} / {pct(rb['two_bit']['stumped_rate_25'])}",
        f"- Selected-question path disagreements: {rb['selected_question_path_disagreements']}",'',
        'The public source itself only has four states, so its uint8 form is a lossless expansion of those same four states. This benchmark proves encoding fidelity, not that future continuous AI probabilities can be collapsed to 2 bits without loss. Pam therefore keeps uint8 as the default until a populated Pam matrix can demonstrate equivalent gameplay after quantization.','',
        '## Full Pam structural size','',
        f"At 53,092 concepts × {ev['proposed_final_question_count']} questions, Pam has {auth_cells:,} cells.",
        f"- uint8 dense matrix: {ev['authoritative_pam_structural_sizes']['uint8_matrix_bytes']:,} bytes before compression/header",
        f"- 2-bit values: {ev['authoritative_pam_structural_sizes']['two_bit_values_bytes']:,} bytes",
        f"- Separate unknown mask: {ev['authoritative_pam_structural_sizes']['unknown_mask_bytes']:,} bytes",
        f"- 2-bit + unknown mask: {ev['authoritative_pam_structural_sizes']['two_bit_plus_unknown_mask_bytes']:,} bytes before compression/header",'',
        '## Current seeded build, no AI','',
        f"- Validation inventory concepts: {build['total_concepts']:,}",
        f"- Questions: {build['canonical_question_count']}",
        f"- Accepted SQLite cells: {build.get('cells_seeded_from_accepted_pam_data',0):,} (0 in remote CI because the accepted SQLite is local)",
        f"- Curated cells: {build.get('cells_seeded_from_curated_pam_evidence',0):,}",
        f"- Verified external cells: {build.get('cells_supported_by_external_sources',0):,}",
        f"- Public 20Q cells: {build.get('cells_seeded_from_public_20q',0):,}",
        f"- Hierarchy cells: {build.get('cells_inferred_from_hierarchy',0):,}",
        f"- AI cells: {build.get('cells_estimated_by_ai',0):,}",
        f"- Remaining unknown cells in fallback validation: {build['unresolved_cells']:,}",
        f"- Estimated remaining unknown cells at authoritative 53,092-concept scale: approximately {estimated_auth_unknown:,}",
        f"- Compiled uint8 gzip artifact in fallback validation: {build['compiled_artifact_size_bytes']:,} bytes",'',
        'No large-scale AI generation has been launched. The exact authoritative unknown-cell count, 452-row inventory report, authoritative public target mapping, and authoritative disagreement count are produced by the local baseline run before any API spend.'
    ]
    OUT.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(OUT)

if __name__=='__main__': main()
