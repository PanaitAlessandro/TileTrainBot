import type { Field, PlacedTile } from "../store";
import { TILES } from "./registry";

// Pool of placeable tiles: everything except "empty".
const POOL = TILES.filter((t) => t.id !== "empty").map((t) => t.id);

export function randomField(cols: number, rows: number, tileSizeMm: number, density = 0.55): Field {
  const tiles: PlacedTile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > density) continue;
      const tileId = POOL[Math.floor(Math.random() * POOL.length)];
      const rotation = ([0, 90, 180, 270] as const)[Math.floor(Math.random() * 4)];
      tiles.push({ id: crypto.randomUUID(), tileId, col: c, row: r, rotation });
    }
  }
  return { cols, rows, tileSizeMm, tiles };
}
