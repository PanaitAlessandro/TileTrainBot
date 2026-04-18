"""Convert a trained .pt into target-specific artifacts.

Targets:
  pi       → model.onnx + boilerplate (OpenCV + onnxruntime)
  coral    → model_int8.tflite + EdgeTPU metadata + Python boilerplate
  rp2040   → model_int8.tflite (micro) + C++ boilerplate
  esp32    → model_int8.tflite (micro) + C++ boilerplate
  generic  → model.onnx

Mock implementation writes placeholder binaries so the pipeline is testable
end-to-end without a GPU / torch stack. Swap in real converters later.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def emit(event: dict) -> None:
    sys.stdout.write(json.dumps(event) + "\n")
    sys.stdout.flush()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--model", required=True, help="Path to model.pt")
    p.add_argument("--target", required=True, choices=["pi", "coral", "rp2040", "esp32", "generic"])
    p.add_argument("--out", required=True)
    args = p.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    emit({"type": "start", "target": args.target})

    if args.target in ("pi", "generic"):
        (out_dir / "model.onnx").write_bytes(b"ONNX-MOCK\x00" + os.urandom(2048))
    if args.target in ("coral", "rp2040", "esp32"):
        (out_dir / "model_int8.tflite").write_bytes(b"TFLITE-MOCK\x00" + os.urandom(2048))

    meta = {"target": args.target, "mock": True}
    (out_dir / "export_meta.json").write_text(json.dumps(meta, indent=2))
    emit({"type": "done", "out": str(out_dir.resolve())})
    return 0


if __name__ == "__main__":
    sys.exit(main())
