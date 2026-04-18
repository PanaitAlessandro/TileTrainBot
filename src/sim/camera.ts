/**
 * Render the robot's camera POV by sampling the rasterized field through a
 * pinhole + radial-distortion model (RPi wide camera approximation).
 *
 * Simplifying assumptions:
 * - Field is a 2D ground plane; camera mounted on robot looking forward, tilted down.
 * - Fisheye distortion applied as radial warp on normalized image plane.
 */

export interface CameraConfig {
  widthPx: number;
  heightPx: number;
  fovDeg: number;
  distortion: number; // 0 = pinhole, 0.4 ≈ RPi wide fisheye
  heightM: number; // camera height above ground
  tiltDeg: number; // pitch down
}

export interface RobotPose {
  x: number; // meters
  y: number;
  theta: number; // radians
}

export function renderCameraPOV(
  out: HTMLCanvasElement,
  fieldCanvas: HTMLCanvasElement,
  fieldSizeM: { w: number; h: number },
  pose: RobotPose,
  cfg: CameraConfig,
) {
  const ctx = out.getContext("2d")!;
  const W = (out.width = cfg.widthPx);
  const H = (out.height = cfg.heightPx);
  const img = ctx.createImageData(W, H);
  const data = img.data;

  const fovRad = (cfg.fovDeg * Math.PI) / 180;
  const f = W / 2 / Math.tan(fovRad / 2);
  const tilt = (cfg.tiltDeg * Math.PI) / 180;
  const k = cfg.distortion;

  const fieldPxPerMX = fieldCanvas.width / fieldSizeM.w;
  const fieldPxPerMY = fieldCanvas.height / fieldSizeM.h;
  const fieldCtx = fieldCanvas.getContext("2d")!;
  const fieldData = fieldCtx.getImageData(0, 0, fieldCanvas.width, fieldCanvas.height).data;
  const fw = fieldCanvas.width;
  const fh = fieldCanvas.height;

  const cosT = Math.cos(pose.theta);
  const sinT = Math.sin(pose.theta);
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  for (let v = 0; v < H; v++) {
    for (let u = 0; u < W; u++) {
      // Normalized image coords.
      let xn = (u - W / 2) / f;
      let yn = (v - H / 2) / f;
      // Inverse fisheye: shrink radius toward center.
      const r2 = xn * xn + yn * yn;
      const scale = 1 + k * r2;
      xn *= scale;
      yn *= scale;
      // Camera ray: forward z, up -y, right x in camera frame.
      let rx = xn;
      let ry = yn;
      let rz = 1;
      // Apply tilt (pitch down) around x.
      const ry2 = ry * cosTilt + rz * sinTilt;
      const rz2 = -ry * sinTilt + rz * cosTilt;
      ry = ry2;
      rz = rz2;
      if (ry <= 1e-3) {
        setPx(data, u, v, W, 40, 40, 45);
        continue;
      }
      // Intersect ground plane y=0 with camera at height h, camera looking forward along z.
      // World coords (camera-local): ground at distance t where cam_y - t * ry = 0 → t = cam_y / ry.
      const t = cfg.heightM / ry;
      const fx = rx * t; // right
      const fz = rz * t; // forward
      // Rotate into world using robot theta (theta measured from +x axis).
      const wx = pose.x + cosT * fz - sinT * fx;
      const wy = pose.y + sinT * fz + cosT * fx;
      const pxX = Math.round(wx * fieldPxPerMX);
      const pxY = Math.round(wy * fieldPxPerMY);
      if (pxX < 0 || pxY < 0 || pxX >= fw || pxY >= fh) {
        setPx(data, u, v, W, 20, 20, 25);
        continue;
      }
      const srcIdx = (pxY * fw + pxX) * 4;
      setPx(data, u, v, W, fieldData[srcIdx], fieldData[srcIdx + 1], fieldData[srcIdx + 2]);
    }
  }
  ctx.putImageData(img, 0, 0);
}

function setPx(data: Uint8ClampedArray, u: number, v: number, W: number, r: number, g: number, b: number) {
  const i = (v * W + u) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = 255;
}
