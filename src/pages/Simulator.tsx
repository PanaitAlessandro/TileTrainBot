import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pause, RotateCcw, Camera, Radar } from "lucide-react";
import { useSim } from "../sim/useSim";
import FieldTopView from "../components/FieldTopView";
import CameraView from "../components/CameraView";
import SensorPanel from "../components/SensorPanel";
import RecordPanel from "../components/RecordPanel";
import { useSensorsMode } from "../store";

export default function Simulator() {
  const { t } = useTranslation();
  const [ctrl, snap] = useSim();
  const camRef = useRef<HTMLCanvasElement | null>(null);
  const { mode, setMode } = useSensorsMode();

  useEffect(() => {
    const keys = new Set<string>();
    const update = () => {
      const fwd = (keys.has("w") ? 1 : 0) + (keys.has("s") ? -1 : 0);
      const turn = (keys.has("a") ? -1 : 0) + (keys.has("d") ? 1 : 0);
      const left = fwd - turn * 0.6;
      const right = fwd + turn * 0.6;
      ctrl.setCommand(left, right);
    };
    const down = (e: KeyboardEvent) => {
      if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
        keys.add(e.key.toLowerCase());
        update();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
        keys.delete(e.key.toLowerCase());
        update();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [ctrl]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2">
        <h1 className="mr-4 text-sm font-semibold">{t("sim.title")}</h1>
        <button
          onClick={() => ctrl.setPlaying(!ctrl.playing)}
          className="flex items-center gap-1 rounded bg-brand-600 px-2 py-1 text-xs hover:bg-brand-500"
        >
          {ctrl.playing ? <Pause size={12} /> : <Play size={12} />}
          {ctrl.playing ? t("sim.pause") : t("sim.play")}
        </button>
        <button
          onClick={ctrl.reset}
          className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
        >
          <RotateCcw size={12} /> {t("sim.reset")}
        </button>
        <label className="ml-4 flex items-center gap-2 text-xs text-zinc-400">
          {t("sim.speed")}
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={ctrl.speed}
            onChange={(e) => ctrl.setSpeed(+e.target.value)}
            className="w-32"
          />
          <span className="tabular-nums text-zinc-300">x{ctrl.speed}</span>
        </label>

        <div className="ml-4 flex overflow-hidden rounded border border-zinc-700 text-[11px]">
          <button
            onClick={() => setMode({ sensorsOnly: false })}
            className={`flex items-center gap-1 px-2 py-1 ${!mode.sensorsOnly ? "bg-brand-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
            title="Vision mode (camera + IR + IMU)"
          >
            <Camera size={11} /> Vision
          </button>
          <button
            onClick={() => setMode({ sensorsOnly: true })}
            className={`flex items-center gap-1 px-2 py-1 ${mode.sensorsOnly ? "bg-brand-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
            title="Sensors-only (IR + ultrasonic + IMU, no camera)"
          >
            <Radar size={11} /> Sensors
          </button>
        </div>

        <div className="ml-auto text-xs text-zinc-500">
          WASD teleop · v={snap.v.toFixed(2)} m/s · ω={snap.omega.toFixed(2)} rad/s
        </div>
      </div>
      <div className="flex flex-1 gap-3 p-3">
        <div className="flex-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30 p-2">
          <FieldTopView snap={snap} />
        </div>
        <div className="flex w-80 shrink-0 flex-col gap-3">
          {!mode.sensorsOnly && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Camera POV</div>
              <CameraView canvasRef={camRef} snap={snap} />
              <div className="mt-3 space-y-1 text-[11px] text-zinc-400">
                <div>pose: ({snap.pose.x.toFixed(2)}, {snap.pose.y.toFixed(2)}) m</div>
                <div>θ: {((snap.pose.theta * 180) / Math.PI).toFixed(1)}°</div>
              </div>
            </div>
          )}
          {mode.sensorsOnly && (
            <div className="rounded-lg border border-cyan-700/40 bg-cyan-500/5 p-3 text-[11px] text-cyan-200">
              <div className="mb-1 flex items-center gap-1 font-semibold">
                <Radar size={12} /> Sensors-only mode
              </div>
              <div className="text-cyan-300/80">
                No camera — ultrasonic + IR + IMU only. Configure beams below.
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1">
                <label className="flex flex-col">
                  <span className="text-zinc-400">US#</span>
                  <input
                    type="number" min={1} max={8}
                    value={mode.usCount}
                    onChange={(e) => setMode({ usCount: Math.max(1, Math.min(8, +e.target.value || 3)) })}
                    className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-100"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-zinc-400">range mm</span>
                  <input
                    type="number" min={100} max={4000}
                    value={mode.usMaxRangeMm}
                    onChange={(e) => setMode({ usMaxRangeMm: +e.target.value || 2000 })}
                    className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-100"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-zinc-400">spread°</span>
                  <input
                    type="number" min={0} max={180}
                    value={mode.usSpreadDeg}
                    onChange={(e) => setMode({ usSpreadDeg: +e.target.value || 90 })}
                    className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-100"
                  />
                </label>
              </div>
            </div>
          )}
          <SensorPanel snap={snap} />
          <RecordPanel snap={snap} ctrl={ctrl} cameraCanvasRef={camRef} />
        </div>
      </div>
    </div>
  );
}
