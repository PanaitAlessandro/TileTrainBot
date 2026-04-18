import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Section = "editor" | "sim" | "trainer" | "exporter" | "analytics";
export type Theme = "dark" | "light";

export interface PlacedTile {
  id: string;
  tileId: string;
  col: number;
  row: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface Field {
  cols: number;
  rows: number;
  tileSizeMm: number;
  tiles: PlacedTile[];
}

export interface RobotConfig {
  kind: "diff" | "omni";
  wheelbaseMm: number;
  wheelRadiusMm: number;
  cameraWidthPx: number;
  cameraHeightPx: number;
  cameraFovDeg: number;
  cameraDistortion: number;
}

export const defaultRobot: RobotConfig = {
  kind: "diff",
  wheelbaseMm: 120,
  wheelRadiusMm: 30,
  cameraWidthPx: 320,
  cameraHeightPx: 240,
  cameraFovDeg: 102,
  cameraDistortion: 0.35,
};

interface UIState {
  section: Section;
  theme: Theme;
  setSection: (s: Section) => void;
  setTheme: (t: Theme) => void;
}

interface FieldState {
  field: Field;
  setField: (f: Field) => void;
  addTile: (t: PlacedTile) => void;
  removeTile: (id: string) => void;
  rotateTile: (id: string) => void;
  clearField: () => void;
}

interface RobotState {
  robot: RobotConfig;
  setRobot: (r: Partial<RobotConfig>) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      section: "editor",
      theme: "dark",
      setSection: (section) => set({ section }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "ttb.ui" },
  ),
);

export const useField = create<FieldState>()(
  persist(
    (set) => ({
      field: { cols: 8, rows: 8, tileSizeMm: 297, tiles: [] },
      setField: (field) => set({ field }),
      addTile: (t) =>
        set((s) => ({ field: { ...s.field, tiles: [...s.field.tiles, t] } })),
      removeTile: (id) =>
        set((s) => ({
          field: { ...s.field, tiles: s.field.tiles.filter((x) => x.id !== id) },
        })),
      rotateTile: (id) =>
        set((s) => ({
          field: {
            ...s.field,
            tiles: s.field.tiles.map((x) =>
              x.id === id
                ? { ...x, rotation: (((x.rotation + 90) % 360) as PlacedTile["rotation"]) }
                : x,
            ),
          },
        })),
      clearField: () =>
        set((s) => ({ field: { ...s.field, tiles: [] } })),
    }),
    { name: "ttb.field" },
  ),
);

export interface Settings {
  pythonPath: string;
  scriptsDir: string;
  outputDir: string;
}

interface SettingsState {
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
}

export const defaultSettings: Settings = {
  pythonPath: "python3",
  scriptsDir: "",
  outputDir: "",
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
    }),
    { name: "ttb.settings" },
  ),
);

export interface EpochPoint {
  epoch: number;
  total: number;
  loss: number;
  accuracy: number;
}
export interface RunRecord {
  id: string;
  createdAt: number;
  model: string;
  epochs: number;
  dataset: string;
  outDir: string;
  epochsLog: EpochPoint[];
  exitCode?: number;
}

interface RunsState {
  runs: RunRecord[];
  addRun: (r: RunRecord) => void;
  updateRun: (id: string, p: Partial<RunRecord>) => void;
  pushEpoch: (id: string, e: EpochPoint) => void;
}

export const useRuns = create<RunsState>()(
  persist(
    (set) => ({
      runs: [],
      addRun: (r) => set((s) => ({ runs: [r, ...s.runs].slice(0, 100) })),
      updateRun: (id, p) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === id ? { ...r, ...p } : r)),
        })),
      pushEpoch: (id, e) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === id ? { ...r, epochsLog: [...r.epochsLog, e] } : r,
          ),
        })),
    }),
    { name: "ttb.runs" },
  ),
);

export interface SensorsMode {
  sensorsOnly: boolean;
  usCount: number;
  usMaxRangeMm: number;
  usSpreadDeg: number;
}

interface SensorsModeState {
  mode: SensorsMode;
  setMode: (p: Partial<SensorsMode>) => void;
}

export const defaultSensorsMode: SensorsMode = {
  sensorsOnly: false,
  usCount: 3,
  usMaxRangeMm: 2000,
  usSpreadDeg: 90,
};

export const useSensorsMode = create<SensorsModeState>()(
  persist(
    (set) => ({
      mode: defaultSensorsMode,
      setMode: (p) => set((s) => ({ mode: { ...s.mode, ...p } })),
    }),
    { name: "ttb.sensorsMode" },
  ),
);

export const useRobot = create<RobotState>()(
  persist(
    (set) => ({
      robot: defaultRobot,
      setRobot: (r) => set((s) => ({ robot: { ...s.robot, ...r } })),
    }),
    { name: "ttb.robot" },
  ),
);
