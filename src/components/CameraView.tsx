import { useEffect, useRef } from "react";
import type { SimSnapshot } from "../sim/useSim";
import { renderCameraPOV } from "../sim/camera";
import { useRobot } from "../store";

export type CameraHandle = HTMLCanvasElement;

interface Props {
  snap: SimSnapshot;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}

export default function CameraView({ snap, canvasRef }: Props) {
  const localRef = useRef<HTMLCanvasElement | null>(null);
  const { robot } = useRobot();

  const setRef = (el: HTMLCanvasElement | null) => {
    localRef.current = el;
    if (canvasRef) canvasRef.current = el;
  };

  useEffect(() => {
    if (!localRef.current || !snap.fieldCanvas) return;
    renderCameraPOV(
      localRef.current,
      snap.fieldCanvas,
      snap.fieldSizeM,
      snap.pose,
      {
        widthPx: robot.cameraWidthPx,
        heightPx: robot.cameraHeightPx,
        fovDeg: robot.cameraFovDeg,
        distortion: robot.cameraDistortion,
        heightM: 0.08,
        tiltDeg: 25,
      },
    );
  }, [snap, robot]);

  return (
    <canvas
      ref={setRef}
      className="rounded-md border border-zinc-800 bg-black"
      style={{ width: "100%", imageRendering: "pixelated" }}
    />
  );
}
