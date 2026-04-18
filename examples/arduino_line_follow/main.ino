// TileTrainBot — baseline PID line-follower for Arduino Uno. No ML.
// Useful as a reference to compare against a trained sensors-only MLP.

constexpr int IR_PINS[5] = {A0, A1, A2, A3, A4};
constexpr int L_IN1 = 4, L_IN2 = 5, L_PWM = 6;
constexpr int R_IN1 = 7, R_IN2 = 8, R_PWM = 9;

float KP = 0.35f, KD = 0.15f;
float BASE_SPEED = 0.45f;

int ir_min[5], ir_max[5];
float prev_err = 0;

void drive(float l, float r) {
  auto apply = [](int in1, int in2, int pwm, float v) {
    digitalWrite(in1, v > 0);
    digitalWrite(in2, v < 0);
    analogWrite(pwm, (int)(constrain(fabs(v), 0.0f, 1.0f) * 255));
  };
  apply(L_IN1, L_IN2, L_PWM, l);
  apply(R_IN1, R_IN2, R_PWM, r);
}

float read_norm(int i) {
  int raw = analogRead(IR_PINS[i]);
  float v = (float)(raw - ir_min[i]) / max(1, ir_max[i] - ir_min[i]);
  return constrain(v, 0.0f, 1.0f);
}

void setup() {
  Serial.begin(115200);
  pinMode(L_IN1, OUTPUT); pinMode(L_IN2, OUTPUT);
  pinMode(R_IN1, OUTPUT); pinMode(R_IN2, OUTPUT);

  for (int i = 0; i < 5; i++) { ir_min[i] = 1023; ir_max[i] = 0; }
  unsigned long t0 = millis();
  while (millis() - t0 < 2000) { // sweep sensors during these 2 seconds
    for (int i = 0; i < 5; i++) {
      int v = analogRead(IR_PINS[i]);
      if (v < ir_min[i]) ir_min[i] = v;
      if (v > ir_max[i]) ir_max[i] = v;
    }
    delay(5);
  }
  Serial.println("calibrated.");
}

void loop() {
  // QTR-5RC: higher raw value on black → invert after normalization so 1 = line.
  float vals[5];
  float sum = 1e-6f, cen = 0;
  for (int i = 0; i < 5; i++) {
    vals[i] = 1.0f - read_norm(i);
    sum += vals[i]; cen += i * vals[i];
  }
  cen /= sum;
  float err = cen - 2.0f; // center of 5-sensor bar

  float d = err - prev_err;
  prev_err = err;
  float turn = KP * err + KD * d;

  float left  = constrain(BASE_SPEED - turn, -1.0f, 1.0f);
  float right = constrain(BASE_SPEED + turn, -1.0f, 1.0f);
  drive(left, right);
  delay(5);
}
