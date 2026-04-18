"""TileTrainBot training entry point.

Streams newline-delimited JSON to stdout; each line is a progress event.
Replace the mock inner loop with SuperGradients / gymnasium when running a
full training environment.

Contract (CLI):
  python train.py --dataset <path/to/zip> --model <yolo-nas|mobilenet-ssd|ppo>
                  --epochs <int> --batch <int> --lr <float> --out <dir>
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
from pathlib import Path


def emit(event: dict) -> None:
    sys.stdout.write(json.dumps(event) + "\n")
    sys.stdout.flush()


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--dataset", required=True)
    p.add_argument("--model", default="yolo-nas", choices=["yolo-nas", "mobilenet-ssd", "ppo"])
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch", type=int, default=16)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--out", required=True)
    p.add_argument("--mock", action="store_true", help="Force mock run even if real deps available")
    args = p.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    emit({"type": "start", "model": args.model, "dataset": args.dataset, "epochs": args.epochs})

    # Detect whether the heavy deps are present. Fall back to mock if not.
    real = False
    if not args.mock:
        try:
            import super_gradients  # type: ignore  # noqa: F401
            real = True
        except Exception:
            real = False

    if not real:
        run_mock(args, out_dir)
    else:
        run_real(args, out_dir)

    emit({"type": "done", "artifacts": str(out_dir.resolve())})
    return 0


def run_mock(args, out_dir: Path) -> None:
    emit({"type": "info", "message": "Using mock trainer (real deps not installed)"})
    rng = random.Random(42)
    for epoch in range(1, args.epochs + 1):
        loss = 1.2 * math.exp(-epoch / max(1, args.epochs / 4)) + rng.uniform(-0.05, 0.05)
        acc = min(0.98, 0.4 + (1 - math.exp(-epoch / max(1, args.epochs / 5))) * 0.6 + rng.uniform(-0.02, 0.02))
        emit(
            {
                "type": "epoch",
                "epoch": epoch,
                "total": args.epochs,
                "loss": round(loss, 4),
                "accuracy": round(acc, 4),
            }
        )
        time.sleep(0.25)
    # Write a placeholder artifact so the exporter has something to convert.
    (out_dir / "model.pt").write_bytes(b"TTB-MOCK\x00" + os.urandom(512))
    (out_dir / "train_meta.json").write_text(
        json.dumps({"model": args.model, "epochs": args.epochs, "mock": True}, indent=2)
    )


def run_real(args, out_dir: Path) -> None:  # pragma: no cover - requires heavy env
    emit({"type": "info", "message": "Real trainer path — TODO wire SuperGradients/PPO here"})
    # TODO: unzip args.dataset, build dataloader, train with super_gradients.Trainer
    # and save to out_dir/model.pt. For v1 skeleton, users supply their own env.
    run_mock(args, out_dir)


if __name__ == "__main__":
    sys.exit(main())
