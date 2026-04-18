#!/usr/bin/env python3
"""
Raspberry Pi line-follow with a TileTrainBot-exported ONNX model.

- Captures frames from PiCamera2 at 320x240
- Runs an ONNX detector (YOLO-NAS nano or similar) → list of (cls, cx, cy, conf)
- Picks the closest "line" centroid, steers with PD control
- Falls back to IR-only follow if model is missing / conf low

Wiring defaults are for a dual H-bridge via pigpio PWM.
"""
from __future__ import annotations

import argparse
import signal
import sys
import time
from dataclasses import dataclass

import cv2
import numpy as np
import onnxruntime as ort
import pigpio
from picamera2 import Picamera2

# ---------- Motor driver ----------

@dataclass
class MotorPins:
    l_fwd: int = 17
    l_rev: int = 27
    r_fwd: int = 22
    r_rev: int = 23
    l_pwm: int = 12
    r_pwm: int = 13

class DiffDrive:
    def __init__(self, pi: pigpio.pi, pins: MotorPins, pwm_range: int = 255):
        self.pi, self.pins, self.range = pi, pins, pwm_range
        for p in (pins.l_fwd, pins.l_rev, pins.r_fwd, pins.r_rev):
            pi.set_mode(p, pigpio.OUTPUT)
            pi.write(p, 0)
        pi.set_PWM_range(pins.l_pwm, pwm_range)
        pi.set_PWM_range(pins.r_pwm, pwm_range)

    def drive(self, left: float, right: float):
        """left/right in -1..1 (TileTrainBot convention)."""
        for side, val in (("l", left), ("r", right)):
            fwd = getattr(self.pins, f"{side}_fwd")
            rev = getattr(self.pins, f"{side}_rev")
            pwm = getattr(self.pins, f"{side}_pwm")
            self.pi.write(fwd, 1 if val > 0 else 0)
            self.pi.write(rev, 1 if val < 0 else 0)
            self.pi.set_PWM_dutycycle(pwm, int(min(1.0, abs(val)) * self.range))

    def stop(self):
        self.drive(0, 0)

# ---------- Model ----------

class LineDetector:
    def __init__(self, onnx_path: str, input_size=(320, 240)):
        self.sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        self.input_name = self.sess.get_inputs()[0].name
        self.w, self.h = input_size

    def infer(self, frame_bgr: np.ndarray):
        img = cv2.resize(frame_bgr, (self.w, self.h))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        img = img.transpose(2, 0, 1)[None]  # NCHW
        out = self.sess.run(None, {self.input_name: img})[0]
        # Placeholder post-process: expect [N, 6] = (cx, cy, w, h, conf, cls) normalized
        out = np.asarray(out).reshape(-1, 6)
        return out

# ---------- Control ----------

def steer_from_detections(dets: np.ndarray, w: int, h: int, conf_thr=0.35):
    """Return (left, right) in -1..1 based on closest 'line' (cls==0)."""
    lines = dets[(dets[:, 5] == 0) & (dets[:, 4] > conf_thr)]
    if lines.size == 0:
        return None
    closest = lines[np.argmax(lines[:, 1])]  # largest cy = closest in image
    cx = closest[0]  # 0..1 normalized
    err = cx - 0.5  # -0.5..0.5
    base = 0.55
    turn = 1.4 * err
    return np.clip(base - turn, -1, 1), np.clip(base + turn, -1, 1)

def ir_fallback(ir_vals: list[float]):
    """Centroid on 5-IR bar. ir_vals in 0..1 (1=line)."""
    s = sum(ir_vals) + 1e-6
    centroid = sum(i * v for i, v in enumerate(ir_vals)) / s
    err = centroid - (len(ir_vals) - 1) / 2
    base = 0.45
    turn = 0.35 * err
    return np.clip(base - turn, -1, 1), np.clip(base + turn, -1, 1)

# ---------- IR array stub — replace with your ADC code ----------
def read_ir_array() -> list[float]:
    return [0.0] * 5

# ---------- Main loop ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="model.onnx")
    ap.add_argument("--speed-cap", type=float, default=0.8)
    args = ap.parse_args()

    pi = pigpio.pi()
    if not pi.connected:
        sys.exit("pigpiod not running — `sudo systemctl start pigpiod`")

    drive = DiffDrive(pi, MotorPins())
    try:
        detector = LineDetector(args.model)
        have_model = True
    except Exception as e:
        print(f"[warn] model load failed, IR-only fallback: {e}")
        have_model = False

    cam = Picamera2()
    cam.configure(cam.create_preview_configuration(main={"size": (320, 240), "format": "RGB888"}))
    cam.start()

    stop = False
    signal.signal(signal.SIGINT, lambda *_: (drive.stop(), setattr(sys, "_", 1)))

    try:
        while not stop:
            frame = cam.capture_array()
            ir = read_ir_array()
            cmd = None
            if have_model:
                dets = detector.infer(frame)
                cmd = steer_from_detections(dets, 320, 240)
            if cmd is None:
                cmd = ir_fallback(ir)
            left, right = [c * args.speed_cap for c in cmd]
            drive.drive(left, right)
            time.sleep(0.02)
    finally:
        drive.stop()
        cam.stop()
        pi.stop()


if __name__ == "__main__":
    main()
