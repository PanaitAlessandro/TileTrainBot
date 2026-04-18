import type { ReactNode } from "react";

export interface TileDef {
  id: string;
  label: string;
  category: "line" | "intersection" | "special" | "empty";
  /** Path to raster asset (served from /public). If absent, `draw()` provides inline SVG. */
  imageSrc?: string;
  draw: () => ReactNode;
}

const SIZE = 297;

const empty = (
  <rect width={SIZE} height={SIZE} fill="#f5f5f4" stroke="#d6d3d1" strokeWidth={2} />
);

const EMPTY_TILE: TileDef = {
  id: "empty",
  label: "Empty",
  category: "empty",
  draw: () => <>{empty}</>,
};

// 64 tiles rasterized from tiles.pdf → public/tiles/tile-01.png .. tile-64.png.
// Each page of the PDF is one tile. Labels are numeric; users can pick by thumbnail in the palette.
const PDF_TILES: TileDef[] = Array.from({ length: 64 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  const src = `/tiles/tile-${n}.png`;
  return {
    id: `t${n}`,
    label: `Tile ${n}`,
    category: "line",
    imageSrc: src,
    draw: () => (
      <>
        {empty}
        <image href={src} x={0} y={0} width={SIZE} height={SIZE} preserveAspectRatio="xMidYMid meet" />
      </>
    ),
  };
});

export const TILES: TileDef[] = [EMPTY_TILE, ...PDF_TILES];

export const TILE_MAP = Object.fromEntries(TILES.map((t) => [t.id, t]));
export const TILE_SIZE = SIZE;
