import { useEffect, useMemo, useRef, useState } from "react";
import { useField, type PlacedTile } from "../store";
import { TILE_MAP } from "../tiles/registry";

interface Props {
  selectedPlacedId: string | null;
  setSelectedPlacedId: (id: string | null) => void;
  selectedTileId: string | null;
  clearSelectedTileId: () => void;
}

export default function FieldCanvas({
  selectedPlacedId,
  setSelectedPlacedId,
  selectedTileId,
  clearSelectedTileId,
}: Props) {
  const { field, addTile, removeTile, rotateTile } = useField();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState<{ x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);

  const size = field.tileSizeMm;
  const W = field.cols * size;
  const H = field.rows * size;

  const byCell = useMemo(() => {
    const m = new Map<string, PlacedTile>();
    for (const t of field.tiles) m.set(`${t.col},${t.row}`, t);
    return m;
  }, [field.tiles]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H) * 0.9;
    setZoom(scale);
    setPan({ x: (rect.width - W * scale) / 2, y: (rect.height - H * scale) / 2 });
  }, [W, H]);

  const toCell = (clientX: number, clientY: number) => {
    const rect = wrapperRef.current!.getBoundingClientRect();
    const sx = clientX - rect.left - pan.x;
    const sy = clientY - rect.top - pan.y;
    const x = sx / zoom;
    const y = sy / zoom;
    const col = Math.floor(x / size);
    const row = Math.floor(y / size);
    if (col < 0 || row < 0 || col >= field.cols || row >= field.rows) return null;
    return { col, row };
  };

  const placeAt = (tileId: string, col: number, row: number) => {
    const existing = byCell.get(`${col},${row}`);
    if (existing) removeTile(existing.id);
    addTile({
      id: crypto.randomUUID(),
      tileId,
      col,
      row,
      rotation: 0,
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tileId =
      e.dataTransfer.getData("application/x-ttb-tile") ||
      e.dataTransfer.getData("text/plain");
    if (!tileId) return;
    const cell = toCell(e.clientX, e.clientY);
    if (!cell) return;
    placeAt(tileId, cell.col, cell.row);
  };

  const onClick = (e: React.MouseEvent) => {
    if (panning) return;
    const cell = toCell(e.clientX, e.clientY);
    if (!cell) return;
    if (selectedTileId) {
      placeAt(selectedTileId, cell.col, cell.row);
      return;
    }
    const hit = byCell.get(`${cell.col},${cell.row}`);
    setSelectedPlacedId(hit ? hit.id : null);
  };

  const onMouseMoveCell = (e: React.MouseEvent) => {
    if (panning) {
      setPan({ x: e.clientX - panning.x, y: e.clientY - panning.y });
      return;
    }
    if (!selectedTileId) {
      setHoverCell(null);
      return;
    }
    setHoverCell(toCell(e.clientX, e.clientY));
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.min(4, Math.max(0.05, zoom * (1 + delta)));
    const rect = wrapperRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ratio = newZoom / zoom;
    setPan({ x: mx - (mx - pan.x) * ratio, y: my - (my - pan.y) * ratio });
    setZoom(newZoom);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setPanning({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const onMouseUp = () => setPanning(null);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      clearSelectedTileId();
      return;
    }
    if (!selectedPlacedId) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      removeTile(selectedPlacedId);
      setSelectedPlacedId(null);
    } else if (e.key === "r" || e.key === "R") {
      rotateTile(selectedPlacedId);
    }
  };

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={onKey}
      onWheel={onWheel}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={onDrop}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMoveCell}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        onMouseUp();
        setHoverCell(null);
      }}
      className="relative h-full w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 outline-none focus:ring-1 focus:ring-brand-500"
      style={{
        cursor: panning ? "grabbing" : selectedTileId ? "copy" : "default",
      }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          position: "absolute",
          left: pan.x,
          top: pan.y,
          width: W * zoom,
          height: H * zoom,
          pointerEvents: "none",
        }}
      >
        <rect width={W} height={H} fill="#e7e5e4" />
        {Array.from({ length: field.cols + 1 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * size}
            y1={0}
            x2={i * size}
            y2={H}
            stroke="#a8a29e"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: field.rows + 1 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * size}
            x2={W}
            y2={i * size}
            stroke="#a8a29e"
            strokeWidth={1}
          />
        ))}
        {field.tiles.map((t) => {
          const def = TILE_MAP[t.tileId];
          if (!def) return null;
          return (
            <g key={t.id} transform={`translate(${t.col * size},${t.row * size})`}>
              <g transform={`rotate(${t.rotation} ${size / 2} ${size / 2})`}>{def.draw()}</g>
              {selectedPlacedId === t.id && (
                <rect
                  width={size}
                  height={size}
                  fill="none"
                  stroke="#5b7cfa"
                  strokeWidth={6}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
        {selectedTileId && hoverCell && (
          <rect
            x={hoverCell.col * size}
            y={hoverCell.row * size}
            width={size}
            height={size}
            fill="rgba(91,124,250,0.15)"
            stroke="#5b7cfa"
            strokeWidth={4}
            strokeDasharray="12 6"
            pointerEvents="none"
          />
        )}
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-zinc-900/80 px-2 py-1 text-[10px] text-zinc-400">
        {Math.round(zoom * 100)}% · {field.cols}×{field.rows} · {size}mm · click tile then click field · drag also works · shift+drag pan · wheel zoom · R rotate · Del remove · Esc deselect
      </div>
    </div>
  );
}
