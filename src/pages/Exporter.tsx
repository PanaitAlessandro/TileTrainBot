import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Package, Download } from "lucide-react";
import JSZip from "jszip";
import { useRuns, useSettings } from "../store";
import { boilerplateFor, readme } from "../templates/boilerplate";
import { downloadBlob } from "../sim/exportDataset";

type Target = "pi" | "coral" | "rp2040" | "esp32" | "generic" | "micropython";

const targets: { id: Target; label: string }[] = [
  { id: "pi", label: "Raspberry Pi (ONNX + OpenCV)" },
  { id: "coral", label: "Coral USB TPU (INT8 tflite)" },
  { id: "rp2040", label: "RP2040 (tflite-micro C++)" },
  { id: "esp32", label: "ESP32-CAM (tflite-micro C++)" },
  { id: "micropython", label: "MicroPython (OpenMV)" },
  { id: "generic", label: "Generic ONNX" },
];

export default function Exporter() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { runs } = useRuns();
  const [selectedRun, setSelectedRun] = useState<string>(runs[0]?.id ?? "");
  const [target, setTarget] = useState<Target>("pi");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedRun && runs[0]) setSelectedRun(runs[0].id);
  }, [runs, selectedRun]);

  const run = runs.find((r) => r.id === selectedRun);

  const doGenerate = async () => {
    if (!run) {
      alert("No trained run selected.");
      return;
    }
    setBusy(true);
    setLog([]);
    const eventName = `export-${crypto.randomUUID()}`;
    const unlisten = await listen<{ stream: string; line: string }>(eventName, (ev) => {
      setLog((l) => [...l.slice(-200), `[${ev.payload.stream}] ${ev.payload.line}`]);
    });
    const exportOut = `${run.outDir}/export-${target}`;
    try {
      const code = await invoke<number>("run_export", {
        args: {
          python: settings.pythonPath,
          script: `${settings.scriptsDir.replace(/\/+$/, "")}/export.py`,
          model: `${run.outDir}/model.pt`,
          target: target === "micropython" ? "coral" : target, // micropython consumes same tflite
          out: exportOut,
          event: eventName,
        },
      });
      setLog((l) => [...l, `exit ${code}`]);

      // Bundle boilerplate + README into a zip alongside Python export.
      const zip = new JSZip();
      const bp = boilerplateFor(target);
      zip.file(bp.filename, bp.code);
      zip.file("README.md", readme(target));
      zip.file("NOTE.txt", `Model artifact location: ${exportOut}\nSee README for how to wire inference.`);
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `ttb-${run.model}-${target}.zip`);
    } catch (err) {
      setLog((l) => [...l, `error: ${String(err)}`]);
    } finally {
      unlisten();
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2">
        <h1 className="mr-4 text-sm font-semibold">{t("exporter.title")}</h1>
        <button
          onClick={doGenerate}
          disabled={!run || busy}
          className="flex items-center gap-1 rounded bg-brand-600 px-2 py-1 text-xs hover:bg-brand-500 disabled:opacity-40"
        >
          <Download size={12} /> {t("exporter.generate")}
        </button>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-3 p-3">
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Trained run</div>
            <select
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
            >
              <option value="">—</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.model} · {new Date(r.createdAt).toLocaleString()} ({r.epochs}ep)
                </option>
              ))}
            </select>
            {run && (
              <div className="mt-2 text-[11px] text-zinc-500">
                out: <span className="font-mono text-zinc-300">{run.outDir}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">{t("exporter.target")}</div>
            <div className="grid grid-cols-1 gap-1">
              {targets.map((tg) => (
                <label
                  key={tg.id}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs ${
                    target === tg.id ? "bg-brand-600/20 text-brand-50" : "hover:bg-zinc-800/60"
                  }`}
                >
                  <input
                    type="radio"
                    checked={target === tg.id}
                    onChange={() => setTarget(tg.id)}
                    className="accent-brand-500"
                  />
                  <Package size={12} /> {tg.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Export log</div>
          <div className="scroll-thin h-full max-h-[60vh] overflow-auto rounded border border-zinc-800 bg-black/60 p-2 font-mono text-[10px] leading-relaxed text-zinc-300">
            {log.length === 0 ? <div className="text-zinc-600">Ready.</div> : log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
