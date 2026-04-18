import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Play, Square, Terminal } from "lucide-react";
import { useRuns, useSettings, type EpochPoint, type RunRecord } from "../store";

type ModelKind = "yolo-nas" | "mobilenet-ssd" | "ppo";

export default function Trainer() {
  const { t } = useTranslation();
  const { settings, setSettings } = useSettings();
  const { runs, addRun, pushEpoch, updateRun } = useRuns();

  const [dataset, setDataset] = useState("");
  const [model, setModel] = useState<ModelKind>("yolo-nas");
  const [epochs, setEpochs] = useState(20);
  const [batch, setBatch] = useState(16);
  const [lr, setLr] = useState(1e-3);
  const [running, setRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [pyVersion, setPyVersion] = useState<string | null>(null);

  useEffect(() => {
    invoke<string>("detect_python", { python: settings.pythonPath })
      .then(setPyVersion)
      .catch(() => setPyVersion(null));
  }, [settings.pythonPath]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const start = async () => {
    if (!settings.scriptsDir || !settings.outputDir || !dataset) {
      alert("Set scripts dir, output dir, dataset path in Settings first.");
      return;
    }
    const runId = crypto.randomUUID();
    const outDir = `${settings.outputDir.replace(/\/+$/, "")}/run-${runId.slice(0, 8)}`;
    const run: RunRecord = {
      id: runId,
      createdAt: Date.now(),
      model,
      epochs,
      dataset,
      outDir,
      epochsLog: [],
    };
    addRun(run);
    setActiveRunId(runId);
    setLog([]);
    setRunning(true);

    const eventName = `train-${runId}`;
    const unlisten = await listen<{ stream: string; line: string }>(eventName, (ev) => {
      const line = ev.payload.line;
      setLog((l) => [...l.slice(-500), `[${ev.payload.stream}] ${line}`]);
      try {
        const j = JSON.parse(line);
        if (j.type === "epoch") {
          const p: EpochPoint = {
            epoch: j.epoch,
            total: j.total,
            loss: j.loss,
            accuracy: j.accuracy,
          };
          pushEpoch(runId, p);
        }
      } catch {
        /* not JSON */
      }
    });

    try {
      const code = await invoke<number>("run_training", {
        args: {
          python: settings.pythonPath,
          script: `${settings.scriptsDir.replace(/\/+$/, "")}/train.py`,
          dataset,
          model,
          epochs,
          batch,
          lr,
          out: outDir,
          event: eventName,
        },
      });
      updateRun(runId, { exitCode: code });
    } catch (err) {
      setLog((l) => [...l, `[error] ${String(err)}`]);
    } finally {
      unlisten();
      setRunning(false);
    }
  };

  const activeRun = runs.find((r) => r.id === activeRunId) ?? runs[0];
  const lastEpoch = activeRun?.epochsLog[activeRun.epochsLog.length - 1];

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2">
          <h1 className="mr-4 text-sm font-semibold">{t("trainer.title")}</h1>
          <button
            onClick={start}
            disabled={running}
            className="flex items-center gap-1 rounded bg-brand-600 px-2 py-1 text-xs hover:bg-brand-500 disabled:opacity-40"
          >
            <Play size={12} /> {t("trainer.start")}
          </button>
          <button
            disabled={!running}
            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700 disabled:opacity-40"
            title="Send SIGTERM (not yet implemented — close window)"
          >
            <Square size={12} /> {t("trainer.stop")}
          </button>
          <div className="ml-auto text-xs text-zinc-500">
            Python: <span className={pyVersion ? "text-emerald-400" : "text-red-400"}>
              {pyVersion ?? "not found"}
            </span>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 p-3">
          <div className="space-y-3">
            <Section title="Dataset">
              <Row label="Dataset .zip path">
                <input
                  type="text"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                  placeholder="/path/to/ttb-session-xxxxxxxx.zip"
                  className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                />
              </Row>
            </Section>

            <Section title="Model">
              <Row label="Kind">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as ModelKind)}
                  className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                >
                  <option value="yolo-nas">YOLO-NAS nano (Pi/Coral)</option>
                  <option value="mobilenet-ssd">MobileNet-SSD (RP2040/ESP32)</option>
                  <option value="ppo">PPO imitation (RL)</option>
                </select>
              </Row>
              <Row label="Epochs">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={epochs}
                  onChange={(e) => setEpochs(+e.target.value || 20)}
                  className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                />
              </Row>
              <Row label="Batch">
                <input
                  type="number"
                  min={1}
                  max={256}
                  value={batch}
                  onChange={(e) => setBatch(+e.target.value || 16)}
                  className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                />
              </Row>
              <Row label="Learning rate">
                <input
                  type="number"
                  step={0.0001}
                  value={lr}
                  onChange={(e) => setLr(+e.target.value || 1e-3)}
                  className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                />
              </Row>
            </Section>

            <Section title="Paths">
              <Row label="Python">
                <input
                  type="text"
                  value={settings.pythonPath}
                  onChange={(e) => setSettings({ pythonPath: e.target.value })}
                  className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                />
              </Row>
              <Row label="Scripts dir">
                <input
                  type="text"
                  value={settings.scriptsDir}
                  onChange={(e) => setSettings({ scriptsDir: e.target.value })}
                  placeholder="/abs/path/to/tiletrainbot/python"
                  className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                />
              </Row>
              <Row label="Output dir">
                <input
                  type="text"
                  value={settings.outputDir}
                  onChange={(e) => setSettings({ outputDir: e.target.value })}
                  placeholder="/abs/path/to/runs"
                  className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                />
              </Row>
            </Section>
          </div>

          <div className="flex flex-col gap-3">
            <Section title="Progress">
              {lastEpoch ? (
                <div className="space-y-2 text-xs">
                  <div>
                    epoch <span className="tabular-nums text-zinc-200">{lastEpoch.epoch}/{lastEpoch.total}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded bg-zinc-800">
                    <div
                      className="h-full bg-brand-500"
                      style={{ width: `${(lastEpoch.epoch / lastEpoch.total) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat label="loss" value={lastEpoch.loss.toFixed(4)} />
                    <MiniStat label="accuracy" value={(lastEpoch.accuracy * 100).toFixed(1) + "%"} />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500">No runs yet.</div>
              )}
            </Section>
            <Section title="Log" flex>
              <div
                ref={logRef}
                className="scroll-thin h-full overflow-auto rounded border border-zinc-800 bg-black/60 p-2 font-mono text-[10px] leading-relaxed text-zinc-300"
              >
                {log.length === 0 ? (
                  <div className="text-zinc-600"><Terminal size={12} className="inline" /> stdout/stderr will stream here.</div>
                ) : (
                  log.map((l, i) => <div key={i}>{l}</div>)
                )}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, flex }: { title: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 ${flex ? "flex flex-1 flex-col" : ""}`}>
      <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">{title}</div>
      <div className={flex ? "flex flex-1 flex-col" : "space-y-2"}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-28 text-xs text-zinc-500">{label}</div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-zinc-950/60 px-2 py-1">
      <div className="text-[10px] uppercase text-zinc-500">{label}</div>
      <div className="font-mono text-sm tabular-nums text-zinc-100">{value}</div>
    </div>
  );
}
