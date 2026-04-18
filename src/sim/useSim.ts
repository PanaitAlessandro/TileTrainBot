import { useEffect, useRef, useState } from "react";
import { useField, useRobot, useSensorsMode } from "../store";
import {
  applyDiffDrive,
  createWorld,
  initRapier,
  resetRobot,
  robotState,
  stepWorld,
  type SimWorld,
} from "./world";
import { rasterizeField } from "./fieldRender";
import {
  defaultSensors,
  sampleIMU,
  sampleIR,
  sampleUltrasonic,
  stepEncoders,
  type EncoderReading,
  type IMUReading,
  type IRReading,
  type SensorConfig,
  type UltrasonicReading,
} from "./sensors";

export interface SimControls {
  playing: boolean;
  speed: number;
  setPlaying: (b: boolean) => void;
  setSpeed: (n: number) => void;
  reset: () => void;
  setCommand: (left: number, right: number) => void;
  getCommand: () => { left: number; right: number };
}

export interface SimSnapshot {
  pose: { x: number; y: number; theta: number };
  v: number;
  omega: number;
  fieldCanvas: HTMLCanvasElement | null;
  fieldSizeM: { w: number; h: number };
  ir: IRReading;
  us: UltrasonicReading;
  imu: IMUReading;
  encoder: EncoderReading;
  simTime: number;
}

const emptyIR: IRReading = { values: [], samplesWorld: [] };
const emptyUS: UltrasonicReading = { distancesM: [], anglesRad: [] };
const emptyIMU: IMUReading = { ax: 0, ay: 0, gyroZ: 0 };
const emptyEnc: EncoderReading = { leftRad: 0, rightRad: 0 };

export function useSim(sensorsCfg: SensorConfig = defaultSensors): [SimControls, SimSnapshot] {
  const { field } = useField();
  const { robot } = useRobot();
  const { mode } = useSensorsMode();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [snap, setSnap] = useState<SimSnapshot>({
    pose: { x: 0, y: 0, theta: 0 },
    v: 0,
    omega: 0,
    fieldCanvas: null,
    fieldSizeM: { w: 1, h: 1 },
    ir: emptyIR,
    us: emptyUS,
    imu: emptyIMU,
    encoder: emptyEnc,
    simTime: 0,
  });

  const simRef = useRef<SimWorld | null>(null);
  const cmdRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const fieldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    vPrev: 0,
    encoder: { leftRad: 0, rightRad: 0 },
    simTime: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initRapier();
      if (cancelled) return;
      simRef.current = createWorld(field, robot);
      const cvs = await rasterizeField(field);
      if (cancelled) return;
      fieldCanvasRef.current = cvs;
      stateRef.current = { vPrev: 0, encoder: { leftRad: 0, rightRad: 0 }, simTime: 0 };
      const s = robotState(simRef.current);
      setSnap({
        pose: { x: s.x, y: s.y, theta: s.theta },
        v: s.v,
        omega: s.omega,
        fieldCanvas: cvs,
        fieldSizeM: { w: simRef.current.widthM, h: simRef.current.heightM },
        ir: emptyIR,
        us: emptyUS,
        imu: emptyIMU,
        encoder: emptyEnc,
        simTime: 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [field, robot]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const sim = simRef.current;
      const fc = fieldCanvasRef.current;
      if (sim && playing && fc) {
        const substeps = Math.min(10, Math.max(1, Math.round(speed)));
        const subDt = dt;
        for (let i = 0; i < substeps; i++) {
          applyDiffDrive(sim, cmdRef.current.left, cmdRef.current.right, subDt);
          stepWorld(sim);
        }
        const s = robotState(sim);
        const ir = sampleIR(fc, { w: sim.widthM, h: sim.heightM }, { x: s.x, y: s.y, theta: s.theta }, sensorsCfg);
        const us = sampleUltrasonic(
          fc,
          { w: sim.widthM, h: sim.heightM },
          { x: s.x, y: s.y, theta: s.theta },
          { count: mode.usCount, maxRangeMm: mode.usMaxRangeMm, spreadDeg: mode.usSpreadDeg },
        );
        const imu = sampleIMU(s.v, stateRef.current.vPrev, s.omega, dt, sensorsCfg);
        const wl = cmdRef.current.left * sim.robot.maxWheelRadS;
        const wr = cmdRef.current.right * sim.robot.maxWheelRadS;
        const encoder = stepEncoders(stateRef.current.encoder, wl, wr, dt, sensorsCfg);
        stateRef.current.encoder = encoder;
        stateRef.current.vPrev = s.v;
        stateRef.current.simTime += dt * substeps;
        setSnap((prev) => ({
          ...prev,
          pose: { x: s.x, y: s.y, theta: s.theta },
          v: s.v,
          omega: s.omega,
          ir,
          us,
          imu,
          encoder,
          simTime: stateRef.current.simTime,
        }));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, sensorsCfg, mode.usCount, mode.usMaxRangeMm, mode.usSpreadDeg]);

  const controls: SimControls = {
    playing,
    speed,
    setPlaying,
    setSpeed,
    reset: () => {
      if (simRef.current) {
        resetRobot(simRef.current);
        stateRef.current = { vPrev: 0, encoder: { leftRad: 0, rightRad: 0 }, simTime: 0 };
        const s = robotState(simRef.current);
        setSnap((prev) => ({
          ...prev,
          pose: { x: s.x, y: s.y, theta: s.theta },
          v: 0,
          omega: 0,
          encoder: emptyEnc,
          simTime: 0,
        }));
      }
    },
    setCommand: (left, right) => {
      cmdRef.current.left = left;
      cmdRef.current.right = right;
    },
    getCommand: () => ({ ...cmdRef.current }),
  };
  return [controls, snap];
}
