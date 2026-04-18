import { useEffect, useRef, useState } from "react";
import { Circle, Square, Download } from "lucide-react";
import { captureFrame, newSession, type Session } from "../sim/recorder";
import { downloadBlob, exportSessionZip } from "../sim/exportDataset";
import type { SimControls, SimSnapshot } from "../sim/useSim";
import { useSensorsMode } from "../store";

interface Props {
  snap: SimSnapshot;
  ctrl: SimControls;
  cameraCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function RecordPanel({ snap, ctrl, cameraCanvasRef }: Props) {
  const { mode } = useSensorsMode();
  const [session, setSession] = useState<Session | null>(null);
  const [fps, setFps] = useState(15);
  const [exporting, setExporting] = useState(false);
  const lastCaptureRef = useRef(0);

  useEffect(() => {
    if (!session) return;
    const interval = 1 / fps;
    if (snap.simTime - lastCaptureRef.current < interval) return;
    const canvas = cameraCanvasRef.current;
    if (!mode.sensorsOnly && !canvas) return;
    lastCaptureRef.current = snap.simTime;
    const cmd = ctrl.getCommand();
    captureFrame(mode.sensorsOnly ? null : canvas, {
      t: snap.simTime,
      pose: snap.pose,
      action: cmd,
      ir: snap.ir,
      us: snap.us,
      imu: snap.imu,
      encoder: snap.encoder,
    }).then((frame) => {
      setSession((s) => (s ? { ...s, frames: [...s.frames, frame] } : s));
    });
  }, [snap, session, fps, ctrl, cameraCanvasRef, mode.sensorsOnly]);

  const start = () => {
    lastCaptureRef.current = snap.simTime;
    setSession(newSession(fps, mode.sensorsOnly));
  };
  const stop = () => {
    if (!session) return;
    ctrl.setPlaying(false);
  };
  const doExport = async () => {
    if (!session) return;
    setExporting(true);
    try {
      const blob = await exportSessionZip(session);
      downloadBlob(blob, `ttb-session-${session.id.slice(0, 8)}.zip`);
    } finally {
      setExporting(false);
    }
  };
  const discard = () => setSession(null);

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <div className="uppercase tracking-wider text-zinc-500">Recording</div>
        <label className="flex items-center gap-1 text-zinc-400">
          fps
          <input
            type="number"
            min={1}
            max={60}
            value={fps}
            onChange={(e) => setFps(Math.max(1, Math.min(60, +e.target.value || 15)))}
            disabled={!!session}
            className="w-12 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {!session ? (
          <button
            onClick={start}
            className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 hover:bg-red-500"
          >
            <Circle size={12} /> Start
          </button>
        ) : (
          <button
            onClick={stop}
            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 hover:bg-zinc-700"
          >
            <Square size={12} /> Stop
          </button>
        )}
        <button
          onClick={doExport}
          disabled={!session || session.frames.length === 0 || exporting}
          className="flex items-center gap-1 rounded bg-brand-600 px-2 py-1 hover:bg-brand-500 disabled:opacity-40"
        >
          <Download size={12} /> {exporting ? "…" : "Export .zip"}
        </button>
        <button
          onClick={discard}
          disabled={!session}
          className="rounded bg-zinc-800 px-2 py-1 hover:bg-zinc-700 disabled:opacity-40"
        >
          Discard
        </button>
      </div>
      <div className="mt-2 text-[11px] text-zinc-400">
        Frames: <span className="tabular-nums">{session?.frames.length ?? 0}</span>
        {session && (
          <> · size≈{Math.round(((session.frames.length * 10_000) / 1024))} KB</>
        )}
      </div>
    </div>
  );
}
