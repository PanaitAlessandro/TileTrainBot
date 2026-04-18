# TileTrainBot

Open-source desktop toolkit for training RoboCup Junior **Rescue Line** robots. Build tile fields, simulate a virtual robot with an RPi camera view, train ML models, and export deploy-ready artifacts for Raspberry Pi, Coral TPU, RP2040, and ESP32-CAM.

> MIT. macOS + Windows. Linux planned.

---

## Features

| Section | What you can do |
|---|---|
| **Tile Editor** | Click a tile in the library (right sidebar), then click a cell on the field to place — or drag. Configurable grid (2–32 cells, tile size in mm). Rotate selected tile with R, remove with Del/Backspace, Esc deselects palette. Randomize, save/load JSON. |
| **Simulator** | Rapier2D physics, differential-drive robot, fisheye RPi-wide camera POV (configurable FOV/distortion), WASD teleop, Play/Pause/Reset, speed x1–x10. |
| **Sensors** | 5-IR raycast array, noisy IMU, slip-modelled encoders, live bar visualiser. |
| **Recorder** | Capture camera frames + pose/action/sensor tuples at configurable fps; export dataset `.zip` with `images/`, `labels/`, `meta.jsonl`, `data.yaml`. |
| **Trainer** | Python 3.12 sidecar streams progress via Tauri events. Mock path works out of the box; install the real deps (`super-gradients`, `onnx`, `tensorflow`, `stable-baselines3`) for YOLO-NAS / MobileNet-SSD / PPO. |
| **Exporter** | Generates `.onnx` (Pi), INT8 `.tflite` (Coral/RP2040/ESP32), and language-appropriate boilerplate (Python + OpenCV, C++ tflite-micro, MicroPython). |
| **Analytics** | Loss + accuracy curves across epochs, run-history table. |

---

## Stack

- **App shell** — Tauri 2 · React 19 · TypeScript · Vite · Tailwind v4 · Zustand (with persistence) · i18next (IT/EN)
- **Physics** — `@dimforge/rapier2d-compat` (wasm, MIT) for interactive sim
- **Tile rendering** — inline SVG → offscreen canvas rasterizer
- **ML pipeline** — Python 3.12 scripts (`python/train.py`, `python/export.py`) invoked via `tokio::process::Command`, streamed to the UI through `tauri::Emitter` events
- **Dataset format** — YOLO directory layout + `meta.jsonl` for imitation learning

---

## Install (end users)

One command, no source clone required. Artifacts are published to [GitHub Releases](https://github.com/PanaitAlessandro/tiletrainbot/releases/latest) by the release workflow.

### macOS (Intel + Apple Silicon)

```sh
curl -fsSL https://raw.githubusercontent.com/PanaitAlessandro/tiletrainbot/main/install.sh | bash
```

Downloads the latest `.dmg`, copies `TileTrainBot.app` to `/Applications`, and strips the Gatekeeper quarantine flag (self-signed builds). Override the source repo with `TILETRAINBOT_REPO=user/fork`.

### Windows 10 / 11

Open PowerShell and run:

```powershell
iwr -useb https://raw.githubusercontent.com/PanaitAlessandro/tiletrainbot/main/install.ps1 | iex
```

Downloads the latest `.msi` from Releases and runs `msiexec /i /passive`.

### Manual download

Browse [Releases](https://github.com/PanaitAlessandro/tiletrainbot/releases) and pick `.dmg` (macOS) or `.msi` (Windows).

> Replace `PanaitAlessandro` with the GitHub org/username hosting your fork. Until you cut your first tag (`git tag v0.1.0 && git push --tags`), the workflow won't have published any assets.

---

## Build from source

Requires Node 20+ and Rust via [rustup](https://rustup.rs/).

```sh
git clone https://github.com/PanaitAlessandro/tiletrainbot
cd tiletrainbot
npm install
npm run tauri dev
```

To produce local installers:

```sh
npm run tauri build
# macOS artifacts: src-tauri/target/release/bundle/{dmg,macos}/
# Windows artifacts: src-tauri/target/release/bundle/{msi,nsis}/
```

### Python (optional — for real training)

```sh
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r python/requirements.txt
```

Then in **Trainer › Paths**:

- *Python* — `./.venv/bin/python` (or `python3` if global)
- *Scripts dir* — absolute path to `python/` in this repo
- *Output dir* — where trained runs are written

The bundled `train.py` falls back to a mock run if `super_gradients` is missing, so the UI pipeline works end-to-end with no GPU.

---

## Dataset pipeline

1. Build a field in **Tile Editor**.
2. Open **Simulator**, hit Play, drive with WASD.
3. Start recording in the right rail (fps selectable).
4. Stop + Export `.zip`.
5. In **Trainer**, point *Dataset* at the zip, pick a model, Start.
6. In **Exporter**, pick target → download deploy zip with model + boilerplate.

Label schema in `data.yaml`: `line, green, victim` (extend as needed).

---

## Tiles

12 MIT-licensed SVG tiles ship inline. Official RCJ Rescue Line assets (CC BY-NC-SA) are **not bundled**; a first-run downloader is on the v1.1 roadmap — until then, you can substitute by editing `src/tiles/registry.tsx`.

---

## Targets

| Target | Artifact | Runtime |
|---|---|---|
| Raspberry Pi | `model.onnx` | `onnxruntime` + OpenCV |
| Coral USB TPU | `model_int8.tflite` | `pycoral` |
| RP2040 | `model_int8.tflite` | `tflite-micro` (Arduino or `pico-tflmicro`) |
| ESP32-CAM | `model_int8.tflite` | `esp-nn` + `tflite-micro` |
| MicroPython | `model_int8.tflite` | `openmv.tf` |
| Generic | `model.onnx` | any ORT |

---

## Build for release

```sh
npm run tauri build
```

Artifacts land in `src-tauri/target/release/bundle/`. GitHub Actions at `.github/workflows/release.yml` builds `aarch64-apple-darwin`, `x86_64-apple-darwin`, and `x86_64-pc-windows-msvc` on tag `v*.*.*`.

### macOS Gatekeeper (self-signed dev builds)

```sh
xattr -d com.apple.quarantine /Applications/TileTrainBot.app
```

### Code-signing notes

The CI workflow produces unsigned bundles. Set these secrets to enable signing:

- macOS: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
- Windows: `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`

---

## Contributing

Issues and PRs are welcome. Roadmap highlights: first-run RCJ tile downloader, ROS 2 export, webcam-driven dataset mode, federated leaderboard hub.

---

## License

MIT — see [LICENSE](LICENSE). Third-party notices:

- Rapier2D (Apache-2.0)
- recharts, jszip, zustand, i18next (MIT)
- Inter, JetBrains Mono (OFL)
