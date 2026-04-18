import type { IMUReading, IRReading, UltrasonicReading } from "./sensors";

export interface Frame {
  t: number; // seconds
  imagePng?: Blob; // absent in sensors-only sessions
  pose: { x: number; y: number; theta: number };
  action: { left: number; right: number };
  ir: IRReading;
  us: UltrasonicReading;
  imu: IMUReading;
  encoder: { leftRad: number; rightRad: number };
}

export interface Session {
  id: string;
  startedAt: number;
  frames: Frame[];
  fps: number;
  sensorsOnly: boolean;
}

export function newSession(fps: number, sensorsOnly = false): Session {
  return { id: crypto.randomUUID(), startedAt: Date.now(), frames: [], fps, sensorsOnly };
}

export async function captureFrame(
  canvas: HTMLCanvasElement | null,
  state: Omit<Frame, "imagePng">,
): Promise<Frame> {
  if (!canvas) return { ...state };
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"),
  );
  return { ...state, imagePng: blob };
}
