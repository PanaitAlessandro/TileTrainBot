import { useEffect, useRef } from "react";
import type { SimSnapshot } from "../sim/useSim";

interface Props {
  snap: SimSnapshot;
}

export default function FieldTopView({ snap }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const out = canvasRef.current;
    const src = snap.fieldCanvas;
    if (!out || !src) return;
    const parent = out.parentElement!;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const fw = snap.fieldSizeM.w;
    const fh = snap.fieldSizeM.h;
    const pxPerM = Math.min(pw / fw, ph / fh) * 0.95;
    out.width = Math.round(fw * pxPerM);
    out.height = Math.round(fh * pxPerM);
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0, out.width, out.height);

    // Robot.
    const rx = snap.pose.x * pxPerM;
    const ry = snap.pose.y * pxPerM;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(snap.pose.theta);
    ctx.fillStyle = "#5b7cfa";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(6, pxPerM * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#eef4ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(pxPerM * 0.1, 0);
    ctx.stroke();
    ctx.restore();
  }, [snap]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <canvas ref={canvasRef} className="rounded-md border border-zinc-800 bg-zinc-950" />
    </div>
  );
}
