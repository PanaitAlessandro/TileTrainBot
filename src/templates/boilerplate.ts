/**
 * Boilerplate inference code emitted by the Exporter.
 * Keep deps-free so users can drop into their robot repo.
 */

export function piPython(): string {
  return `# TileTrainBot - Raspberry Pi inference (onnxruntime + OpenCV)
import cv2, numpy as np, onnxruntime as ort

sess = ort.InferenceSession("model.onnx", providers=["CPUExecutionProvider"])
inp_name = sess.get_inputs()[0].name

cap = cv2.VideoCapture(0)
while True:
    ok, frame = cap.read()
    if not ok: break
    img = cv2.resize(frame, (320, 240))
    x = img.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
    y = sess.run(None, {inp_name: x})[0]
    # TODO: post-process y into (left, right) motor commands
    print(y[0])
`;
}

export function coralPython(): string {
  return `# TileTrainBot - Coral USB TPU inference
from pycoral.utils.edgetpu import make_interpreter
from pycoral.adapters import common
import cv2

it = make_interpreter("model_int8.tflite")
it.allocate_tensors()
cap = cv2.VideoCapture(0)
while True:
    ok, frame = cap.read()
    if not ok: break
    img = cv2.resize(frame, common.input_size(it))
    common.set_input(it, img)
    it.invoke()
    # TODO: read outputs and drive motors
`;
}

export function rp2040Cpp(): string {
  return `// TileTrainBot - RP2040 inference stub (tflite-micro).
// Wire with TensorFlowLite_RP2040 arduino-lib (or pico-tflmicro) and the
// Arducam/PiCam frame source you use on hardware.
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"

extern const unsigned char g_model[];
extern const int g_model_len;

constexpr int kArenaSize = 64 * 1024;
alignas(16) uint8_t tensor_arena[kArenaSize];

void setup() {
    const tflite::Model* model = tflite::GetModel(g_model);
    static tflite::MicroInterpreter interpreter(model, ...);
    interpreter.AllocateTensors();
}

void loop() {
    // capture frame → interpreter.input(0), invoke, read interpreter.output(0)
}
`;
}

export function esp32Cpp(): string {
  return `// TileTrainBot - ESP32-CAM inference stub (ESP-NN + tflite-micro).
#include "esp_camera.h"
#include "tensorflow/lite/micro/micro_interpreter.h"

extern const unsigned char g_model[];
extern const int g_model_len;

void setup() {
    // init camera at QVGA 320x240 for the model
}

void loop() {
    camera_fb_t* fb = esp_camera_fb_get();
    // copy fb->buf → interpreter.input(0) (resize/normalize)
    // interpreter.Invoke();
    esp_camera_fb_return(fb);
}
`;
}

export function micropython(): string {
  return `# TileTrainBot - MicroPython stub (OpenMV / similar)
import sensor, image, tf

net = tf.load("model_int8.tflite")
sensor.reset(); sensor.set_framesize(sensor.QVGA); sensor.set_pixformat(sensor.RGB565)

while True:
    img = sensor.snapshot()
    out = net.predict(img)
    # TODO: drive motors from out
`;
}

export function readme(target: string): string {
  return `# TileTrainBot export — ${target}

Model artifact bundled; inference boilerplate provided in code.{ext}.
Replace the TODO blocks with motor driver + post-processing for your robot.
`;
}

export function boilerplateFor(target: string) {
  switch (target) {
    case "pi":
      return { filename: "inference.py", code: piPython() };
    case "coral":
      return { filename: "inference.py", code: coralPython() };
    case "rp2040":
      return { filename: "inference.cpp", code: rp2040Cpp() };
    case "esp32":
      return { filename: "inference.cpp", code: esp32Cpp() };
    case "micropython":
      return { filename: "main.py", code: micropython() };
    default:
      return { filename: "inference.py", code: piPython() };
  }
}
