# Coral USB TPU + Pi — INT8 tflite

30–50 FPS inference on the Edge TPU. Use the `model_int8.tflite` exported from TileTrainBot's Exporter (target: *Coral USB TPU*).

## Install

```sh
echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" \
  | sudo tee /etc/apt/sources.list.d/coral-edgetpu.list
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
sudo apt update && sudo apt install libedgetpu1-std python3-pycoral
pip install opencv-python picamera2
```

Plug in the Coral stick, drop `model_int8.tflite` next to `main.py`, then:

```sh
python3 main.py --model model_int8.tflite
```
