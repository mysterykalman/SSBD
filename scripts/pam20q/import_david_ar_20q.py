#!/usr/bin/env python3
"""Import david-ar/20q into Pam20Q development data.

Build-time/development utility only. It downloads a pinned Hugging Face revision,
verifies the published model SHA-256, parses the safetensors container without
third-party dependencies, and writes deterministic offline reference artifacts.
No production runtime code imports this module or talks to Hugging Face.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "data/pam20q/reference/david-ar-20q"
REVISION = "2363b1f67ed554275dc2bd14032390325aa7ae29"
MODEL_URL = f"https://huggingface.co/david-ar/20q/resolve/{REVISION}/model.safetensors"
VOCAB_URL = f"https://huggingface.co/david-ar/20q/resolve/{REVISION}/vocab.json"
DATASET_URL = "https://huggingface.co/datasets/david-ar/20q-dataset"
PUBLISHED_MODEL_SHA256 = "2951edb8c699882522bb7bf5d473a9dba7b7e6ec9d0b61e7e131633c2e22b72c"
EXPECTED_QUESTIONS = 156
EXPECTED_TARGETS = 1200
EXPECTED_CELLS = EXPECTED_QUESTIONS * EXPECTED_TARGETS


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "SSBD-Pam20Q-reference-import/1"})
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_safetensors(data: bytes) -> tuple[dict, bytes]:
    if len(data) < 8:
        raise ValueError("safetensors file too short")
    header_len = struct.unpack("<Q", data[:8])[0]
    header_end = 8 + header_len
    header = json.loads(data[8:header_end].decode("utf-8"))
    return header, data[header_end:]


def extract_weight_matrix(model_data: bytes) -> tuple[bytes, dict]:
    header, payload = parse_safetensors(model_data)
    meta = header.get("weight_matrix")
    if not meta:
        raise ValueError("weight_matrix tensor missing")
    if meta.get("dtype") != "U8":
        raise ValueError(f"unexpected weight_matrix dtype: {meta.get('dtype')}")
    shape = list(meta.get("shape") or [])
    if shape != [EXPECTED_QUESTIONS, EXPECTED_TARGETS]:
        raise ValueError(f"unexpected weight_matrix shape: {shape}")
    start, end = meta["data_offsets"]
    weights = payload[start:end]
    if len(weights) != EXPECTED_CELLS:
        raise ValueError(f"weight count {len(weights)} != {EXPECTED_CELLS}")
    values = set(weights)
    if not values.issubset({0, 1, 2, 3}):
        raise ValueError(f"unexpected 2-bit states: {sorted(values)}")
    return weights, meta


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    model_data = download(MODEL_URL)
    vocab_data = download(VOCAB_URL)
    model_hash = sha256(model_data)
    vocab_hash = sha256(vocab_data)
    if model_hash != PUBLISHED_MODEL_SHA256:
        raise SystemExit(f"model SHA-256 mismatch: {model_hash}")

    vocab = json.loads(vocab_data.decode("utf-8"))
    questions = list(vocab.get("questions") or [])
    targets = list(vocab.get("targets") or [])
    if len(questions) != EXPECTED_QUESTIONS:
        raise SystemExit(f"expected {EXPECTED_QUESTIONS} questions, got {len(questions)}")
    if len(targets) != EXPECTED_TARGETS:
        raise SystemExit(f"expected {EXPECTED_TARGETS} targets, got {len(targets)}")
    if len(set(questions)) != len(questions):
        raise SystemExit("duplicate public questions")

    weights, tensor_meta = extract_weight_matrix(model_data)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "weights.u2states.bin").write_bytes(weights)
    write_json(args.out / "questions.json", {"questions": questions})
    write_json(args.out / "targets.json", {"targets": targets})
    write_json(
        args.out / "weight-semantics.json",
        {
            "format": "uint8 carrying four 2-bit states",
            "source_code_semantics": {
                "0": {"label": "weak_no", "polarity_bit": 0, "strong_bit": 0},
                "1": {"label": "weak_yes", "polarity_bit": 1, "strong_bit": 0},
                "2": {"label": "strong_no", "polarity_bit": 0, "strong_bit": 1},
                "3": {"label": "strong_yes", "polarity_bit": 1, "strong_bit": 1},
            },
            "pam_probability_projection": {
                "0": 0.25,
                "1": 0.75,
                "2": 0.02,
                "3": 0.98,
            },
            "unknown": "not represented in the public target matrix; Pam keeps unknown in a separate mask/sentinel",
        },
    )
    write_json(
        args.out / "provenance.json",
        {
            "source_model": "david-ar/20q",
            "source_dataset": "david-ar/20q-dataset",
            "license": "MIT",
            "revision": REVISION,
            "model_url": MODEL_URL,
            "dataset_url": DATASET_URL,
            "model_sha256": model_hash,
            "vocab_sha256": vocab_hash,
            "derived_weights_sha256": sha256(weights),
            "question_count": len(questions),
            "target_count": len(targets),
            "matrix_cells": len(weights),
            "tensor": tensor_meta,
            "runtime_dependency": False,
        },
    )
    print(json.dumps({
        "questions": len(questions),
        "targets": len(targets),
        "cells": len(weights),
        "model_sha256": model_hash,
        "vocab_sha256": vocab_hash,
        "weights_sha256": sha256(weights),
        "output": str(args.out),
    }, indent=2))


if __name__ == "__main__":
    main()
