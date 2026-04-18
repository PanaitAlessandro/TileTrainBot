// TileTrainBot — ESP32-CAM line follower (tflite-micro)
// Expects model_data.cc (xxd of your exported model_int8.tflite) in the same sketch folder.

#include "esp_camera.h"
#include <TensorFlowLite_ESP32.h>
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"

extern const unsigned char g_model[];
extern const unsigned int g_model_len;

#define CAMERA_MODEL_AI_THINKER
#include "camera_pins.h"

// ----- Motor pins -----
constexpr int L_IN1 = 12, L_IN2 = 13, R_IN1 = 14, R_IN2 = 15;
constexpr int L_PWM = 2,  R_PWM = 4;
constexpr int PWM_FREQ = 20000, PWM_RES = 8, PWM_CH_L = 0, PWM_CH_R = 1;

// ----- IR -----
constexpr int IR_PINS[] = {32, 33, 35};
constexpr int N_IR = sizeof(IR_PINS) / sizeof(IR_PINS[0]);
float ir_white[N_IR], ir_black[N_IR];

// ----- tflite-micro arena -----
constexpr int kArenaSize = 400 * 1024;
static uint8_t tensor_arena[kArenaSize];
tflite::MicroInterpreter* interpreter = nullptr;
TfLiteTensor* input_tensor = nullptr;

void drive(float left, float right) {
  auto apply = [](int in1, int in2, int ch, float v) {
    digitalWrite(in1, v > 0);
    digitalWrite(in2, v < 0);
    float a = fabsf(v);
    if (a > 1.0f) a = 1.0f;
    ledcWrite(ch, (int)(a * 255));
  };
  apply(L_IN1, L_IN2, PWM_CH_L, left);
  apply(R_IN1, R_IN2, PWM_CH_R, right);
}

float read_ir(int i) {
  int raw = analogRead(IR_PINS[i]);
  float v = (raw - ir_white[i]) / (ir_black[i] - ir_white[i] + 1e-3f);
  if (v < 0) v = 0; if (v > 1) v = 1;
  return v;
}

void ir_fallback(float* left, float* right) {
  float sum = 1e-6f, cen = 0;
  for (int i = 0; i < N_IR; i++) { float v = read_ir(i); sum += v; cen += i * v; }
  cen /= sum;
  float err = cen - (N_IR - 1) / 2.0f;
  float base = 0.45f, turn = 0.35f * err;
  *left  = constrain(base - turn, -1.0f, 1.0f);
  *right = constrain(base + turn, -1.0f, 1.0f);
}

void setup() {
  Serial.begin(115200);
  pinMode(L_IN1, OUTPUT); pinMode(L_IN2, OUTPUT);
  pinMode(R_IN1, OUTPUT); pinMode(R_IN2, OUTPUT);
  ledcSetup(PWM_CH_L, PWM_FREQ, PWM_RES); ledcAttachPin(L_PWM, PWM_CH_L);
  ledcSetup(PWM_CH_R, PWM_FREQ, PWM_RES); ledcAttachPin(R_PWM, PWM_CH_R);

  // Calibrate IR on boot — hold over white 1s, then black 1s. Simple 2-point calibration.
  for (int i = 0; i < N_IR; i++) ir_white[i] = analogRead(IR_PINS[i]);
  delay(1000);
  for (int i = 0; i < N_IR; i++) ir_black[i] = analogRead(IR_PINS[i]);

  // Camera init (QQVGA 160x120 grayscale for speed)
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM; config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM; config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM; config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM; config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM; config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM; config.pin_href  = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM; config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM; config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_GRAYSCALE;
  config.frame_size   = FRAMESIZE_QQVGA;
  config.fb_count     = 1;
  if (esp_camera_init(&config) != ESP_OK) { Serial.println("camera fail"); delay(5000); ESP.restart(); }

  // tflite-micro setup
  const tflite::Model* model = tflite::GetModel(g_model);
  static tflite::AllOpsResolver resolver;
  static tflite::MicroInterpreter static_interpreter(model, resolver, tensor_arena, kArenaSize);
  interpreter = &static_interpreter;
  if (interpreter->AllocateTensors() != kTfLiteOk) { Serial.println("alloc fail"); }
  input_tensor = interpreter->input(0);
  Serial.println("ready.");
}

void loop() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { delay(10); return; }

  // Copy + resize grayscale into INT8 tensor (nearest neighbour).
  int iw = input_tensor->dims->data[2];
  int ih = input_tensor->dims->data[1];
  int8_t* dst = input_tensor->data.int8;
  for (int y = 0; y < ih; y++) {
    int sy = y * fb->height / ih;
    for (int x = 0; x < iw; x++) {
      int sx = x * fb->width / iw;
      dst[y * iw + x] = (int8_t)(fb->buf[sy * fb->width + sx] - 128);
    }
  }
  esp_camera_fb_return(fb);

  float left, right;
  if (interpreter->Invoke() == kTfLiteOk) {
    TfLiteTensor* out = interpreter->output(0);
    // Placeholder post-process: assume regression head [left, right] in -1..1.
    float l = out->params.scale * (out->data.int8[0] - out->params.zero_point);
    float r = out->params.scale * (out->data.int8[1] - out->params.zero_point);
    left = constrain(l, -1.0f, 1.0f);
    right = constrain(r, -1.0f, 1.0f);
  } else {
    ir_fallback(&left, &right);
  }

  drive(left * 0.8f, right * 0.8f);
}
