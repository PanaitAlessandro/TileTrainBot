import type { RobotPose } from "./camera";

export interface IRReading {
  /** normalized darkness 0..1 (1 = full black line) */
  values: number[];
  /** world-space sample points for debug overlay */
  samplesWorld: { x: number; y: number }[];
}

export interface IMUReading {
  ax: number; // m/s^2 body frame
  ay: number;
  gyroZ: number; // rad/s
}

export interface EncoderReading {
  leftRad: number;
  rightRad: number;
}

export interface SensorConfig {
  irCount: number;
  irSpreadMm: number; // lateral span of the IR array
  irForwardMm: number; // forward offset of the array from robot center
  imuNoise: number; // sigma
  encoderSlip: number; // 0..1
}

export const defaultSensors: SensorConfig = {
  irCount: 5,
  irSpreadMm: 80,
  irForwardMm: 70,
  imuNoise: 0.15,
  encoderSlip: 0.03,
};

export function sampleIR(
  fieldCanvas: HTMLCanvasElement,
  fieldSizeM: { w: number; h: number },
  pose: RobotPose,
  cfg: SensorConfig,
): IRReading {
  const ctx = fieldCanvas.getContext("2d", { willReadFrequently: true })!;
  const pxPerMX = fieldCanvas.width / fieldSizeM.w;
  const pxPerMY = fieldCanvas.height / fieldSizeM.h;
  const forwardM = cfg.irForwardMm / 1000;
  const spreadM = cfg.irSpreadMm / 1000;
  const n = cfg.irCount;
  const cosT = Math.cos(pose.theta);
  const sinT = Math.sin(pose.theta);
  const values: number[] = [];
  const samples: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
    const lx = forwardM;
    const ly = t * spreadM * 0.5;
    const wx = pose.x + cosT * lx - sinT * ly;
    const wy = pose.y + sinT * lx + cosT * ly;
    samples.push({ x: wx, y: wy });
    const px = Math.round(wx * pxPerMX);
    const py = Math.round(wy * pxPerMY);
    if (px < 0 || py < 0 || px >= fieldCanvas.width || py >= fieldCanvas.height) {
      values.push(0);
      continue;
    }
    const d = ctx.getImageData(px, py, 1, 1).data;
    const brightness = (d[0] + d[1] + d[2]) / 3 / 255;
    values.push(1 - brightness);
  }
  return { values, samplesWorld: samples };
}

export interface UltrasonicConfig {
  count: number;
  maxRangeMm: number;
  spreadDeg: number;
}

export interface UltrasonicReading {
  /** per-sensor distance in meters (clamped to maxRange) */
  distancesM: number[];
  /** per-sensor beam angle relative to robot heading (rad) */
  anglesRad: number[];
}

/** Raycast each ultrasonic beam against the rasterized field until a dark pixel (obstacle) or max range. */
export function sampleUltrasonic(
  fieldCanvas: HTMLCanvasElement,
  fieldSizeM: { w: number; h: number },
  pose: RobotPose,
  cfg: UltrasonicConfig,
  bodyRadiusM = 0.06,
): UltrasonicReading {
  const ctx = fieldCanvas.getContext("2d", { willReadFrequently: true })!;
  const pxPerMX = fieldCanvas.width / fieldSizeM.w;
  const pxPerMY = fieldCanvas.height / fieldSizeM.h;
  const maxM = cfg.maxRangeMm / 1000;
  const spread = (cfg.spreadDeg * Math.PI) / 180;
  const n = cfg.count;
  const stepM = 0.01;
  const distances: number[] = [];
  const angles: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    const a = t * (spread / 2);
    const theta = pose.theta + a;
    const cx = Math.cos(theta);
    const sy = Math.sin(theta);
    let dist = maxM;
    for (let m = bodyRadiusM; m <= maxM; m += stepM) {
      const wx = pose.x + cx * m;
      const wy = pose.y + sy * m;
      if (wx < 0 || wy < 0 || wx >= fieldSizeM.w || wy >= fieldSizeM.h) {
        dist = m;
        break;
      }
      const px = Math.round(wx * pxPerMX);
      const py = Math.round(wy * pxPerMY);
      const d = ctx.getImageData(px, py, 1, 1).data;
      const b = (d[0] + d[1] + d[2]) / 3 / 255;
      if (b < 0.25) {
        dist = m;
        break;
      }
    }
    distances.push(dist);
    angles.push(a);
  }
  return { distancesM: distances, anglesRad: angles };
}

export function sampleIMU(v: number, vPrev: number, omega: number, dt: number, cfg: SensorConfig): IMUReading {
  const accel = dt > 0 ? (v - vPrev) / dt : 0;
  const n = cfg.imuNoise;
  return {
    ax: accel + gauss() * n,
    ay: gauss() * n,
    gyroZ: omega + gauss() * n * 0.5,
  };
}

export function stepEncoders(
  prev: EncoderReading,
  wheelLeftRadS: number,
  wheelRightRadS: number,
  dt: number,
  cfg: SensorConfig,
): EncoderReading {
  const slip = () => 1 - Math.random() * cfg.encoderSlip;
  return {
    leftRad: prev.leftRad + wheelLeftRadS * dt * slip(),
    rightRad: prev.rightRad + wheelRightRadS * dt * slip(),
  };
}

// Box-Muller
function gauss() {
  const u = Math.random() || 1e-9;
  const v = Math.random() || 1e-9;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
