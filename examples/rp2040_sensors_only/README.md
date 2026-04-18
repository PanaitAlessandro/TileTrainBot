# RP2040 (Pi Pico) — sensors-only MLP

For teams without a camera. Trains a small **MLP** (`mlp_sensors` in the Trainer) from `ir + us + imu` features to `(left, right)` wheel commands, exports `model_int8.tflite`, runs on an RP2040 with `pico-tflmicro`.

- 5× IR analog sensors (QTR-5RC or similar)
- 3× HC-SR04 ultrasonic (front + two diagonals, 45° spread)
- MPU-6050 IMU over I²C

## Build (Arduino-Pico core)

1. Install **arduino-pico** core.
2. Install library **`pico-tflmicro`** (or the `EloquentTinyML` port).
3. Convert your exported model: `xxd -i model_int8.tflite > model_data.cc`.
4. Board: *Raspberry Pi Pico*, Partition: default.

Flash `main.ino`. Serial at 115200 for telemetry.

## Why sensors-only

MLP is tiny (~10 KB INT8), inference <1 ms on RP2040. No camera means no image bus, no PSRAM, no latency spikes from JPEG compression. Good for Rescue Line teams focused on pure line + intersection detection with a fast control loop.
