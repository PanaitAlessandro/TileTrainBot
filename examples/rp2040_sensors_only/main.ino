// TileTrainBot — RP2040 sensors-only MLP controller.
// Expects model_data.cc (xxd of your exported model_int8.tflite) in the sketch folder.

#include <Wire.h>
#include <TensorFlowLite.h>
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"

extern const unsigned char g_model[];

// ---------- Pinout ----------
constexpr int IR_PINS[5]    = {26, 27, 28, 29, 6}; // A0..A3 + one GPIO
constexpr int US_TRIG[3]    = {10, 12, 14};
constexpr int US_ECHO[3]    = {11, 13, 15};
constexpr int L_IN1 = 2, L_IN2 = 3, L_PWM = 4;
constexpr int R_IN1 = 5, R_IN2 = 7, R_PWM = 8;

// MPU-6050 minimal (ax, ay, gz)
constexpr uint8_t MPU = 0x68;
float ax = 0, ay = 0, gz = 0;

// ---------- tflite-micro ----------
constexpr int kArena = 24 * 1024;
static uint8_t tensor_arena[kArena];
tflite::MicroInterpreter* interp;
TfLiteTensor* in_t;
TfLiteTensor* out_t;

// ---------- Helpers ----------
float read_ir(int i) {
  // QTR-5RC: 0..1023; invert so 1 = black line.
  return 1.0f - constrain(analogRead(IR_PINS[i]) / 1023.0f, 0.0f, 1.0f);
}

float read_us(int i) {
  digitalWrite(US_TRIG[i], LOW); delayMicroseconds(2);
  digitalWrite(US_TRIG[i], HIGH); delayMicroseconds(10);
  digitalWrite(US_TRIG[i], LOW);
  unsigned long pulse = pulseIn(US_ECHO[i], HIGH, 25000UL); // 25 ms ≈ 4 m cap
  if (pulse == 0) return 2.0f;
  return pulse * 0.000343f / 2.0f; // seconds * speed_of_sound / 2
}

void read_imu() {
  Wire.beginTransmission(MPU); Wire.write(0x3B); Wire.endTransmission(false);
  Wire.requestFrom((int)MPU, 14, true);
  int16_t axi = (Wire.read() << 8) | Wire.read();
  int16_t ayi = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read(); Wire.read(); Wire.read();
  Wire.read(); Wire.read(); Wire.read(); Wire.read();
  int16_t gzi; Wire.read(); Wire.read(); Wire.read(); Wire.read();
  gzi = (Wire.read() << 8) | Wire.read();
  ax = axi / 16384.0f * 9.81f;
  ay = ayi / 16384.0f * 9.81f;
  gz = gzi / 131.0f * (3.14159f / 180.0f);
}

void drive(float l, float r) {
  auto apply = [](int in1, int in2, int pwm, float v) {
    digitalWrite(in1, v > 0);
    digitalWrite(in2, v < 0);
    analogWrite(pwm, (int)(constrain(fabsf(v), 0.0f, 1.0f) * 255));
  };
  apply(L_IN1, L_IN2, L_PWM, l);
  apply(R_IN1, R_IN2, R_PWM, r);
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 3; i++) { pinMode(US_TRIG[i], OUTPUT); pinMode(US_ECHO[i], INPUT); }
  pinMode(L_IN1, OUTPUT); pinMode(L_IN2, OUTPUT);
  pinMode(R_IN1, OUTPUT); pinMode(R_IN2, OUTPUT);
  Wire.begin();
  Wire.beginTransmission(MPU); Wire.write(0x6B); Wire.write(0); Wire.endTransmission(true);

  const tflite::Model* model = tflite::GetModel(g_model);
  static tflite::AllOpsResolver resolver;
  static tflite::MicroInterpreter static_interp(model, resolver, tensor_arena, kArena);
  interp = &static_interp;
  interp->AllocateTensors();
  in_t = interp->input(0);
  out_t = interp->output(0);
  Serial.println("sensors-only controller ready.");
}

void loop() {
  // 5 IR + 3 US + 3 IMU = 11 features, match Trainer's mlp_sensors input layout.
  float feats[11];
  for (int i = 0; i < 5; i++) feats[i] = read_ir(i);
  for (int i = 0; i < 3; i++) feats[5 + i] = read_us(i);
  read_imu();
  feats[8] = ax; feats[9] = ay; feats[10] = gz;

  for (int i = 0; i < 11; i++) {
    in_t->data.int8[i] = (int8_t)roundf(feats[i] / in_t->params.scale + in_t->params.zero_point);
  }
  interp->Invoke();
  float l = out_t->params.scale * (out_t->data.int8[0] - out_t->params.zero_point);
  float r = out_t->params.scale * (out_t->data.int8[1] - out_t->params.zero_point);
  drive(constrain(l, -1.0f, 1.0f) * 0.8f, constrain(r, -1.0f, 1.0f) * 0.8f);
}
