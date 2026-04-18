import JSZip from "jszip";
import type { Session } from "./recorder";

/**
 * Export session as a dataset zip.
 * Vision mode:   images/ + labels/ + meta.jsonl + data.yaml + README.md
 * Sensors-only:  meta.jsonl + sensors.yaml + README.md (no images)
 */
export async function exportSessionZip(session: Session): Promise<Blob> {
  const zip = new JSZip();
  const metaLines: string[] = [];

  const imgs = session.sensorsOnly ? null : zip.folder("images");
  const lbls = session.sensorsOnly ? null : zip.folder("labels");

  for (let i = 0; i < session.frames.length; i++) {
    const f = session.frames[i];
    const name = String(i).padStart(6, "0");
    if (!session.sensorsOnly && f.imagePng) {
      imgs!.file(`${name}.png`, f.imagePng);
      lbls!.file(`${name}.txt`, "");
    }
    metaLines.push(
      JSON.stringify({
        frame: name,
        t: f.t,
        pose: f.pose,
        action: f.action,
        ir: f.ir.values,
        us: f.us.distancesM,
        us_angles: f.us.anglesRad,
        imu: f.imu,
        encoder: f.encoder,
      }),
    );
  }

  zip.file("meta.jsonl", metaLines.join("\n"));

  if (session.sensorsOnly) {
    zip.file(
      "sensors.yaml",
      `# TileTrainBot sensors-only dataset\nmode: sensors_only\nfeatures:\n  - ir\n  - ultrasonic\n  - imu\n  - encoder\naction: [left, right]  # normalized -1..1 wheel command\n`,
    );
  } else {
    zip.file(
      "data.yaml",
      `# TileTrainBot dataset\npath: .\ntrain: images\nval: images\nnc: 3\nnames:\n  - line\n  - green\n  - victim\n`,
    );
  }
  zip.file(
    "README.md",
    `# TileTrainBot session ${session.id}\nRecorded ${new Date(session.startedAt).toISOString()}\nFrames: ${session.frames.length}\nMode: ${session.sensorsOnly ? "sensors-only" : "vision"}\n\nmeta.jsonl: one JSON per frame with pose/action/sensor readings.\n${session.sensorsOnly ? "No images — use ir/us/imu/encoder features to train a non-vision controller." : "labels/*.txt: YOLO placeholders (populate via auto-labeler for detection training)."}\n`,
  );
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
