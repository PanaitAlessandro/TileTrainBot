import { useTranslation } from "react-i18next";
import { TILES } from "../tiles/registry";
import { Tile } from "../tiles/Tile";

interface Props {
  onSelect?: (tileId: string) => void;
  selectedTileId?: string | null;
}

export default function TilePalette({ onSelect, selectedTileId }: Props) {
  const { t } = useTranslation();
  return (
    <aside className="flex w-56 flex-col border-l border-zinc-800 bg-zinc-900/40">
      <div className="px-3 py-2 text-xs uppercase tracking-wider text-zinc-500">
        {t("editor.library")}
      </div>
      {selectedTileId && (
        <div className="mx-2 mb-1 rounded bg-brand-600/20 px-2 py-1 text-[11px] text-brand-50">
          Click on the field to place · ESC to deselect
        </div>
      )}
      <div className="scroll-thin grid grid-cols-2 gap-2 overflow-y-auto p-2">
        {TILES.map((tile) => (
          <div
            key={tile.id}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-ttb-tile", tile.id);
              e.dataTransfer.setData("text/plain", tile.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onSelect?.(tile.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect?.(tile.id);
            }}
            className={`group flex cursor-pointer flex-col items-center rounded-md border p-1 transition ${
              selectedTileId === tile.id
                ? "border-brand-500 bg-brand-500/15 ring-1 ring-brand-500"
                : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
            }`}
            title={`${tile.label} — click then click field, or drag`}
          >
            <div className="pointer-events-none">
              <Tile tileId={tile.id} size={72} />
            </div>
            <div className="mt-1 w-full truncate text-center text-[10px] text-zinc-400">
              {tile.label}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
