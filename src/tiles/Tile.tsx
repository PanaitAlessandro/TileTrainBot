import { TILE_MAP, TILE_SIZE } from "./registry";

interface Props {
  tileId: string;
  rotation?: number;
  size?: number;
  className?: string;
}

export function Tile({ tileId, rotation = 0, size = TILE_SIZE, className }: Props) {
  const def = TILE_MAP[tileId];
  if (!def) return null;
  return (
    <svg
      viewBox={`0 0 ${TILE_SIZE} ${TILE_SIZE}`}
      width={size}
      height={size}
      className={className}
    >
      <g transform={`rotate(${rotation} ${TILE_SIZE / 2} ${TILE_SIZE / 2})`}>{def.draw()}</g>
    </svg>
  );
}
