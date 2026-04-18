import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCw, Trash2, Shuffle, Eraser, Download, Upload } from "lucide-react";
import { z } from "zod";
import TilePalette from "../components/TilePalette";
import FieldCanvas from "../components/FieldCanvas";
import { useField } from "../store";
import { randomField } from "../tiles/random";

const FieldSchema = z.object({
  cols: z.number().int().min(2).max(32),
  rows: z.number().int().min(2).max(32),
  tileSizeMm: z.number().positive().max(2000),
  tiles: z.array(
    z.object({
      id: z.string(),
      tileId: z.string(),
      col: z.number().int().nonnegative(),
      row: z.number().int().nonnegative(),
      rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    }),
  ),
});

export default function TileEditor() {
  const { t } = useTranslation();
  const { field, setField, clearField, removeTile, rotateTile } = useField();
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onPaletteSelect = (id: string) =>
    setSelectedTileId((prev) => (prev === id ? null : id));

  const doSave = () => {
    const blob = new Blob([JSON.stringify(field, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ttb-field-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doLoad = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      const parsed = FieldSchema.parse(json);
      setField(parsed);
    } catch (err) {
      console.error("Field load failed", err);
      alert("Invalid field file");
    }
  };

  const doRandom = () => {
    setField(randomField(field.cols, field.rows, field.tileSizeMm));
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2">
          <h1 className="mr-4 text-sm font-semibold">{t("editor.title")}</h1>
          <label className="flex items-center gap-1 text-xs text-zinc-400">
            Cols
            <input
              type="number"
              min={2}
              max={32}
              value={field.cols}
              onChange={(e) =>
                setField({ ...field, cols: Math.max(2, Math.min(32, +e.target.value || 2)) })
              }
              className="w-14 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-zinc-400">
            Rows
            <input
              type="number"
              min={2}
              max={32}
              value={field.rows}
              onChange={(e) =>
                setField({ ...field, rows: Math.max(2, Math.min(32, +e.target.value || 2)) })
              }
              className="w-14 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-zinc-400">
            mm
            <input
              type="number"
              min={50}
              max={2000}
              step={1}
              value={field.tileSizeMm}
              onChange={(e) => setField({ ...field, tileSizeMm: +e.target.value || 297 })}
              className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5"
            />
          </label>

          <div className="mx-2 h-5 w-px bg-zinc-800" />

          <button
            onClick={() => selectedPlacedId && rotateTile(selectedPlacedId)}
            disabled={!selectedPlacedId}
            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700 disabled:opacity-40"
          >
            <RotateCw size={12} /> {t("editor.rotate")}
          </button>
          <button
            onClick={() => {
              if (selectedPlacedId) {
                removeTile(selectedPlacedId);
                setSelectedPlacedId(null);
              }
            }}
            disabled={!selectedPlacedId}
            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700 disabled:opacity-40"
          >
            <Trash2 size={12} /> {t("editor.delete")}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={doRandom}
              className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            >
              <Shuffle size={12} /> {t("editor.random")}
            </button>
            <button
              onClick={clearField}
              className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            >
              <Eraser size={12} /> {t("editor.clear")}
            </button>
            <button
              onClick={doSave}
              className="flex items-center gap-1 rounded bg-brand-600 px-2 py-1 text-xs hover:bg-brand-500"
            >
              <Download size={12} /> {t("editor.save")}
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
            >
              <Upload size={12} /> {t("editor.load")}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doLoad(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="flex-1 p-3">
          <FieldCanvas
            selectedPlacedId={selectedPlacedId}
            setSelectedPlacedId={setSelectedPlacedId}
            selectedTileId={selectedTileId}
            clearSelectedTileId={() => setSelectedTileId(null)}
          />
        </div>
      </div>
      <TilePalette onSelect={onPaletteSelect} selectedTileId={selectedTileId} />
    </div>
  );
}
