import type { Field } from "../store";
import { TILE_MAP, TILE_SIZE } from "../tiles/registry";
import { renderToStaticMarkup } from "react-dom/server";

const imgCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string, cache = false): Promise<HTMLImageElement> {
  if (cache && imgCache.has(url)) return imgCache.get(url)!;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  if (cache) imgCache.set(url, p);
  return p;
}

/**
 * Rasterize the field to a single offscreen canvas (pixels = mm * scale).
 * Line pixels (near black) are the line-follow texture sampled by sensors.
 */
export async function rasterizeField(field: Field, pxPerMm = 1.5): Promise<HTMLCanvasElement> {
  const w = field.cols * field.tileSizeMm * pxPerMm;
  const h = field.rows * field.tileSizeMm * pxPerMm;
  const cvs = document.createElement("canvas");
  cvs.width = Math.round(w);
  cvs.height = Math.round(h);
  const ctx = cvs.getContext("2d")!;
  ctx.fillStyle = "#e7e5e4";
  ctx.fillRect(0, 0, cvs.width, cvs.height);

  for (const t of field.tiles) {
    const def = TILE_MAP[t.tileId];
    if (!def) continue;
    const size = field.tileSizeMm * pxPerMm;
    const px = t.col * field.tileSizeMm * pxPerMm;
    const py = t.row * field.tileSizeMm * pxPerMm;

    if (def.imageSrc) {
      const img = await loadImage(def.imageSrc, true);
      ctx.save();
      ctx.translate(px + size / 2, py + size / 2);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}" width="${TILE_SIZE}" height="${TILE_SIZE}"><g transform="rotate(${t.rotation} ${TILE_SIZE / 2} ${TILE_SIZE / 2})">${renderToStaticMarkup(def.draw() as any)}</g></svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      try {
        const img = await loadImage(url);
        ctx.drawImage(img, px, py, size, size);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  }
  return cvs;
}
