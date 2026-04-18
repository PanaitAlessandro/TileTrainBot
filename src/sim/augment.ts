export interface AugmentConfig {
  brightness: number; // 0 disabled; recommended 0..0.3
  blur: number; // px radius 0..3
  noise: number; // 0..0.1
  flip: boolean;
}

export function augmentImage(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: AugmentConfig,
): ImageData {
  const img = srcCtx.getImageData(0, 0, width, height);
  if (cfg.brightness) {
    const b = (Math.random() * 2 - 1) * cfg.brightness;
    const add = Math.round(b * 255);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = clamp255(img.data[i] + add);
      img.data[i + 1] = clamp255(img.data[i + 1] + add);
      img.data[i + 2] = clamp255(img.data[i + 2] + add);
    }
  }
  if (cfg.noise) {
    const n = cfg.noise * 255;
    for (let i = 0; i < img.data.length; i += 4) {
      const r = (Math.random() * 2 - 1) * n;
      img.data[i] = clamp255(img.data[i] + r);
      img.data[i + 1] = clamp255(img.data[i + 1] + r);
      img.data[i + 2] = clamp255(img.data[i + 2] + r);
    }
  }
  if (cfg.flip) {
    const out = new ImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const src = (y * width + x) * 4;
        const dst = (y * width + (width - 1 - x)) * 4;
        out.data[dst] = img.data[src];
        out.data[dst + 1] = img.data[src + 1];
        out.data[dst + 2] = img.data[src + 2];
        out.data[dst + 3] = 255;
      }
    }
    return out;
  }
  return img;
}

function clamp255(x: number) {
  return x < 0 ? 0 : x > 255 ? 255 : x;
}
