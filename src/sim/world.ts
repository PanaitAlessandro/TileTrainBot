import RAPIER from "@dimforge/rapier2d-compat";
import type { Field, RobotConfig } from "../store";

let ready: Promise<void> | null = null;
export function initRapier(): Promise<void> {
  if (!ready) ready = RAPIER.init();
  return ready;
}

export interface RobotBody {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  wheelbaseM: number;
  wheelRadiusM: number;
  maxWheelRadS: number;
}

export interface SimWorld {
  world: RAPIER.World;
  robot: RobotBody;
  // field geometry in meters
  widthM: number;
  heightM: number;
}

export function createWorld(field: Field, robotCfg: RobotConfig, tilt = 0): SimWorld {
  const s = field.tileSizeMm / 1000;
  const widthM = field.cols * s;
  const heightM = field.rows * s;

  // Gravity simulates tilt (ramps approx 2.5D): g projected onto field plane.
  const g = 9.81 * Math.sin(tilt);
  const world = new RAPIER.World({ x: 0, y: g });

  // Perimeter walls.
  const wallT = 0.02;
  const walls: [number, number, number, number][] = [
    [widthM / 2, -wallT / 2, widthM / 2, wallT / 2],
    [widthM / 2, heightM + wallT / 2, widthM / 2, wallT / 2],
    [-wallT / 2, heightM / 2, wallT / 2, heightM / 2],
    [widthM + wallT / 2, heightM / 2, wallT / 2, heightM / 2],
  ];
  for (const [cx, cy, hx, hy] of walls) {
    const rb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy).setRestitution(0.1), rb);
  }

  // Robot body.
  const rbDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(widthM / 2, heightM / 2)
    .setLinearDamping(2.0)
    .setAngularDamping(3.0);
  const body = world.createRigidBody(rbDesc);
  const bodyRadiusM = Math.max(robotCfg.wheelbaseMm / 1000 / 2, 0.08);
  const colDesc = RAPIER.ColliderDesc.ball(bodyRadiusM).setDensity(1.2).setFriction(0.7);
  const collider = world.createCollider(colDesc, body);

  return {
    world,
    robot: {
      body,
      collider,
      wheelbaseM: robotCfg.wheelbaseMm / 1000,
      wheelRadiusM: robotCfg.wheelRadiusMm / 1000,
      maxWheelRadS: 20,
    },
    widthM,
    heightM,
  };
}

// Differential-drive command mapped to impulses on the body.
export function applyDiffDrive(
  sim: SimWorld,
  left: number,
  right: number,
  dt: number,
) {
  const { body, wheelbaseM, wheelRadiusM, maxWheelRadS } = sim.robot;
  const wl = clamp(left, -1, 1) * maxWheelRadS;
  const wr = clamp(right, -1, 1) * maxWheelRadS;
  const v = wheelRadiusM * (wl + wr) * 0.5;
  const omega = (wheelRadiusM * (wr - wl)) / wheelbaseM;
  const theta = body.rotation();
  // Set velocities directly — simple kinematic control with a little impulse for realism.
  body.setLinvel({ x: v * Math.cos(theta), y: v * Math.sin(theta) }, true);
  body.setAngvel(omega, true);
  void dt;
}

function clamp(x: number, lo: number, hi: number) {
  return x < lo ? lo : x > hi ? hi : x;
}

export function stepWorld(sim: SimWorld) {
  sim.world.step();
}

export function robotState(sim: SimWorld) {
  const p = sim.robot.body.translation();
  const theta = sim.robot.body.rotation();
  const lin = sim.robot.body.linvel();
  const ang = sim.robot.body.angvel();
  return {
    x: p.x,
    y: p.y,
    theta,
    v: Math.hypot(lin.x, lin.y),
    omega: ang,
  };
}

export function resetRobot(sim: SimWorld) {
  sim.robot.body.setTranslation({ x: sim.widthM / 2, y: sim.heightM / 2 }, true);
  sim.robot.body.setRotation(0, true);
  sim.robot.body.setLinvel({ x: 0, y: 0 }, true);
  sim.robot.body.setAngvel(0, true);
}
