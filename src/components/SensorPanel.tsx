import type { SimSnapshot } from "../sim/useSim";

export default function SensorPanel({ snap }: { snap: SimSnapshot }) {
  const ir = snap.ir.values;
  const us = snap.us.distancesM;
  const maxBar = 120;
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-xs">
      <div className="mb-2 uppercase tracking-wider text-zinc-500">Sensors</div>
      <div className="mb-3">
        <div className="mb-1 text-zinc-400">IR array</div>
        <div className="flex items-end gap-1">
          {ir.length === 0 ? (
            <span className="text-zinc-600">—</span>
          ) : (
            ir.map((v, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  height: `${Math.max(2, v * maxBar)}px`,
                  background: `rgb(${30 + (1 - v) * 220},${30 + (1 - v) * 220},${30 + (1 - v) * 220})`,
                }}
                title={v.toFixed(2)}
              />
            ))
          )}
        </div>
      </div>
      <div className="mb-3">
        <div className="mb-1 text-zinc-400">Ultrasonic (m)</div>
        <div className="flex items-end gap-1">
          {us.length === 0 ? (
            <span className="text-zinc-600">—</span>
          ) : (
            us.map((d, i) => {
              const norm = Math.min(1, d / 2);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm bg-gradient-to-t from-cyan-600 to-cyan-300"
                    style={{ height: `${Math.max(2, norm * maxBar)}px` }}
                    title={`${d.toFixed(2)} m`}
                  />
                  <span className="text-[10px] tabular-nums text-zinc-400">{d.toFixed(2)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-400 tabular-nums">
        <div>ax</div><div className="text-zinc-200">{snap.imu.ax.toFixed(2)}</div>
        <div>ay</div><div className="text-zinc-200">{snap.imu.ay.toFixed(2)}</div>
        <div>gz</div><div className="text-zinc-200">{snap.imu.gyroZ.toFixed(2)}</div>
        <div>encL</div><div className="text-zinc-200">{snap.encoder.leftRad.toFixed(1)}</div>
        <div>encR</div><div className="text-zinc-200">{snap.encoder.rightRad.toFixed(1)}</div>
        <div>simT</div><div className="text-zinc-200">{snap.simTime.toFixed(1)}s</div>
      </div>
    </div>
  );
}
