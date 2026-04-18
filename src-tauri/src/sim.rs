use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default)]
pub struct SimState {
    pub x: f32,
    pub y: f32,
    pub theta: f32,
    pub v: f32,
    pub omega: f32,
}

#[derive(Serialize, Deserialize)]
pub struct SimInput {
    pub dt: f32,
    pub left_pwm: f32,
    pub right_pwm: f32,
    pub wheelbase_mm: f32,
    pub wheel_radius_mm: f32,
    pub state: SimState,
}

#[tauri::command]
pub fn sim_step(input: SimInput) -> SimState {
    // Placeholder differential-drive integrator. Rapier2D world wiring lands in W3.
    let max_rad_s = 20.0;
    let wl = input.left_pwm.clamp(-1.0, 1.0) * max_rad_s;
    let wr = input.right_pwm.clamp(-1.0, 1.0) * max_rad_s;
    let r = input.wheel_radius_mm / 1000.0;
    let b = input.wheelbase_mm / 1000.0;
    let v = r * (wl + wr) * 0.5;
    let omega = r * (wr - wl) / b;
    let mut s = input.state;
    s.theta += omega * input.dt;
    s.x += v * s.theta.cos() * input.dt;
    s.y += v * s.theta.sin() * input.dt;
    s.v = v;
    s.omega = omega;
    s
}
