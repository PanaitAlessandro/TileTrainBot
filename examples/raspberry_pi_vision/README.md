# Raspberry Pi + PiCam — ONNX line follower

Inference on CPU with `onnxruntime`. Tested on Pi 4 (2GB) and Pi 5. ~20 FPS at 320×240 with YOLO-NAS nano.

## Install

```sh
sudo apt install python3-opencv python3-pip
pip install onnxruntime numpy picamera2 pigpio
sudo systemctl enable pigpiod && sudo systemctl start pigpiod
```

Drop your exported `model.onnx` next to `main.py`.

## Pinout (defaults in `main.py`)

| Signal | BCM pin |
|---|---|
| Left motor FWD / REV | 17 / 27 |
| Right motor FWD / REV | 22 / 23 |
| Left PWM | 12 |
| Right PWM | 13 |
| IR array (MUX ADC CH0–4) | via MCP3008 SPI |

## Run

```sh
python3 main.py --model model.onnx
```
