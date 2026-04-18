#!/usr/bin/env python3
"""Coral USB TPU line follower — mirrors raspberry_pi_vision but runs on the EdgeTPU."""
from __future__ import annotations

import argparse
import time

import cv2
import numpy as np
from picamera2 import Picamera2
from pycoral.utils.edgetpu import make_interpreter
from pycoral.adapters import common, detect

# Motor control identical to the Pi example — import from your own motor module if you prefer.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "raspberry_pi_vision"))
from main import DiffDrive, MotorPins, steer_from_detections, ir_fallback, read_ir_array  # noqa: E402

import pigpio  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="model_int8.tflite")
    ap.add_argument("--speed-cap", type=float, default=0.85)
    ap.add_argument("--thr", type=float, default=0.4)
    args = ap.parse_args()

    interpreter = make_interpreter(args.model)
    interpreter.allocate_tensors()
    in_w, in_h = common.input_size(interpreter)

    pi = pigpio.pi()
    drive = DiffDrive(pi, MotorPins())

    cam = Picamera2()
    cam.configure(cam.create_preview_configuration(main={"size": (in_w, in_h), "format": "RGB888"}))
    cam.start()

    try:
        while True:
            frame = cam.capture_array()
            common.set_input(interpreter, frame)
            interpreter.invoke()
            objs = detect.get_objects(interpreter, args.thr)
            dets = np.array(
                [[(o.bbox.xmin + o.bbox.xmax) / (2 * in_w),
                  (o.bbox.ymin + o.bbox.ymax) / (2 * in_h),
                  (o.bbox.xmax - o.bbox.xmin) / in_w,
                  (o.bbox.ymax - o.bbox.ymin) / in_h,
                  o.score, o.id] for o in objs],
                dtype=np.float32,
            )
            cmd = steer_from_detections(dets, in_w, in_h) if len(dets) else None
            if cmd is None:
                cmd = ir_fallback(read_ir_array())
            left, right = [c * args.speed_cap for c in cmd]
            drive.drive(left, right)
            time.sleep(0.01)
    finally:
        drive.stop()
        cam.stop()
        pi.stop()


if __name__ == "__main__":
    main()
