# ESP32-CAM (AI-Thinker) — tflite-micro line follower

Runs a tiny MobileNet-SSD `model_int8.tflite` directly on the ESP32. Camera capture via `esp_camera`, inference via TensorFlow Lite for Microcontrollers + `esp-nn` (INT8 SIMD kernels).

## Prerequisites (Arduino IDE)

1. Boards → **ESP32 by Espressif Systems** (2.x).
2. Install libraries: **`tflite-micro` (by Espressif fork)**, **`ESP32Servo`** (optional for motors).
3. Board: *AI Thinker ESP32-CAM*, PSRAM: **Enabled**, Partition: **Huge App (3MB No OTA)**.

## Files

- `main.ino` — camera init + inference + motor driver + IR fallback.
- `model_data.cc` — regenerate from your exported `model_int8.tflite`:

```sh
xxd -i -n g_model model_int8.tflite > model_data.cc
```

Then flash. Serial at 115200 prints the chosen wheel commands.

## Pins (AI-Thinker)

| Signal | GPIO |
|---|---|
| L motor IN1 / IN2 | 12 / 13 |
| R motor IN1 / IN2 | 14 / 15 |
| L / R PWM | 2 / 4 (LEDC ch 0 / 1) |
| IR CH0–2 (ADC) | 32 / 33 / 35 |

Camera pins are fixed (`CAMERA_MODEL_AI_THINKER`).
