# TileTrainBot — Deploy Examples

Ready-to-run reference code for the five most common RoboCup Junior Rescue Line hardware targets. Each folder is a self-contained starter: drop in your exported `model.onnx` / `model_int8.tflite` from TileTrainBot's **Exporter**, tweak the pins for your chassis, flash/run.

| Folder | Platform | Model format | Sensor profile | Best for |
|---|---|---|---|---|
| [`raspberry_pi_vision/`](raspberry_pi_vision) | Raspberry Pi 4/5 + PiCam | `model.onnx` | Camera + IR bar | High-accuracy vision, Python-friendly teams |
| [`coral_tpu_vision/`](coral_tpu_vision) | RPi + Coral USB TPU | `model_int8.tflite` | Camera + IR | 30+ FPS inference, low CPU |
| [`esp32cam_tflite/`](esp32cam_tflite) | ESP32-CAM (AI-Thinker) | `model_int8.tflite` | Camera-only | Tiny, battery-friendly vision |
| [`rp2040_sensors_only/`](rp2040_sensors_only) | Raspberry Pi Pico (RP2040) | `model_int8.tflite` (MLP) | IR array + ultrasonic + IMU | Teams without cameras |
| [`arduino_line_follow/`](arduino_line_follow) | Arduino Uno / Mega | none (classic PID) | IR array only | Beginners, pure C++, no ML |

---

## Workflow (same on every target)

1. **Build a field** in the Tile Editor.
2. **Drive + record** in the Simulator — pick **Vision** or **Sensors-only** mode in the top bar. Export `.zip`.
3. **Train** in the Trainer — point *Dataset* at the `.zip`. Model options:
   - `yolo_nas_nano` — detector, best for Pi/Coral
   - `mobilenet_ssd` — lighter detector, ESP32-CAM
   - `mlp_sensors` — no vision, straight from `ir + us + imu` → `(left, right)` (use with Sensors-only dataset)
   - `ppo_rl` — reinforcement policy, experimental
4. **Export** in the Exporter — pick your target, download the deploy zip (model + boilerplate). The code in this `examples/` folder is a richer version of that boilerplate, with real control loops wired up.
5. Open the matching folder below and follow the per-folder README.

---

## Dataset schema cheat sheet

`meta.jsonl` — one line per frame:

```json
{
  "frame": "000042", "t": 1.40,
  "pose": {"x": 1.2, "y": 0.8, "theta": 0.15},
  "action": {"left": 0.8, "right": 0.6},
  "ir":  [0.91, 0.92, 0.14, 0.93, 0.90],
  "us":  [1.80, 0.42, 2.00],
  "us_angles": [-0.78, 0.0, 0.78],
  "imu": {"ax": 0.02, "ay": 0.00, "gyroZ": 0.18},
  "encoder": {"leftRad": 12.4, "rightRad": 12.1}
}
```

- **`action.left / .right`** are normalized wheel commands in `-1..1`. Multiply by your motor PWM range on-device.
- **`ir[]`** is normalized darkness (1 = full black line under the sensor).
- **`us[]`** is meters, clamped to your configured max range. Only present in sensors-only recordings.

---

## Calibration — the part students skip

The simulator is noisy on purpose (IMU gaussian noise, encoder slip, camera distortion) so a model that generalizes in sim tends to survive on the real robot. But you **still need to calibrate**:

- **IR baseline** — record 2 seconds on white tile, 2 seconds on black line, clamp to that range on-device before feeding the model.
- **Ultrasonic** — HC-SR04 reports ~2cm dead-zone. Clamp `us` readings to `[0.02, max_range]` on-device to match the sim.
- **Wheel command → PWM** — the sim emits `-1..1`. On Pi use `pigpio`, on RP2040 use `pwm_set_chan_level`. Linearize with a single scale factor first, add deadband only if the motor doesn't move at low PWM.

---

## License

All example code MIT. Official RoboCup Junior tile graphics are CC BY-NC-SA (not bundled — use `tiles.pdf` or substitute your own).
