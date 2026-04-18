import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRuns } from "../store";

export default function Analytics() {
  const { t } = useTranslation();
  const { runs } = useRuns();
  const [selectedId, setSelectedId] = useState<string>(runs[0]?.id ?? "");
  const run = runs.find((r) => r.id === selectedId) ?? runs[0];

  const data = useMemo(() => run?.epochsLog ?? [], [run]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2">
        <h1 className="mr-4 text-sm font-semibold">{t("analytics.title")}</h1>
        <select
          value={run?.id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        >
          <option value="">—</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.model} · {new Date(r.createdAt).toLocaleString()}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-zinc-500">
          {runs.length} run{runs.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-3 overflow-auto p-3">
        <Chart title="Loss">
          {data.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="epoch" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="loss" stroke="#5b7cfa" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Chart>
        <Chart title="Accuracy">
          {data.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="epoch" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} domain={[0, 1]} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="accuracy" stroke="#16a34a" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Chart>

        <Chart title="Runs overview" span>
          <div className="h-full overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-zinc-500">
                <tr>
                  <th className="px-2 py-1">When</th>
                  <th className="px-2 py-1">Model</th>
                  <th className="px-2 py-1">Epochs</th>
                  <th className="px-2 py-1">Last loss</th>
                  <th className="px-2 py-1">Last acc</th>
                  <th className="px-2 py-1">Exit</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const last = r.epochsLog[r.epochsLog.length - 1];
                  return (
                    <tr key={r.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                      <td className="px-2 py-1 text-zinc-400">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-1">{r.model}</td>
                      <td className="px-2 py-1 tabular-nums">{r.epochs}</td>
                      <td className="px-2 py-1 tabular-nums">{last?.loss.toFixed(4) ?? "—"}</td>
                      <td className="px-2 py-1 tabular-nums">
                        {last ? (last.accuracy * 100).toFixed(1) + "%" : "—"}
                      </td>
                      <td className="px-2 py-1 tabular-nums">{r.exitCode ?? "…"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Chart>
      </div>
    </div>
  );
}

const tipStyle = { background: "#18181b", border: "1px solid #3f3f46", fontSize: 11 };

function Chart({ title, children, span }: { title: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 ${span ? "col-span-2" : ""}`}>
      <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">{title}</div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function Empty() {
  return <div className="flex h-full items-center justify-center text-xs text-zinc-600">No data yet.</div>;
}
