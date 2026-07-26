"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { curveAngle, curvePoint, easeOutCubic } from "@/src/animations/canvasMotion";
import { useGameStore } from "@/src/store/gameStore";
import type { RoundState } from "@/src/types/game";
import { clamp, formatMultiplier } from "@/src/utils/format";

interface SceneSnapshot {
  roundState: RoundState;
  multiplier: number;
  elapsed: number;
}

const statusCopy: Record<RoundState, string> = {
  waiting: "EN ATTENTE DU PROCHAIN TOUR",
  countdown: "TOUR COMMENCE BIENTOT",
  flying: "EN VOL",
  crashed: "CRASH!",
  finished: "EN ATTENTE DU PROCHAIN TOUR",
};

const createJetPaths = (P: typeof Path2D) => ({
  tailFin: new P(`
    M -46 4 L -50 -24
    C -50 -27 -47 -28 -44 -24
    L -21 -3 L -10 0 L -35 6 Z
  `),

  farWing: new P(`
    M -17 -1 L 25 -5 L 4 -29
    C 2 -31 -1 -30 -3 -27
    L -21 -1 Z
  `),

  rearStabilizer: new P(`
    M -45 4 L -24 16
    C -22 17 -19 16 -17 14
    L -29 4 L -13 2 L -37 1 Z
  `),

  body: new P(`
    M -56 3
    C -46 0 -35 -2 -22 -3
    L 31 -8
    C 43 -9 54 -6 61 -2
    C 65 0 67 2 66 4
    C 63 8 55 10 44 11
    C 32 13 18 13 4 13
    L -34 12
    C -44 12 -51 9 -56 6
    C -58 5 -58 4 -56 3 Z
  `),

  belly: new P(`
    M -55 4
    C -34 5 -12 5 12 5
    C 34 5 53 3 65 2
    C 66 4 63 7 58 8
    C 47 12 31 13 4 13
    L -34 12
    C -44 12 -51 9 -56 6 Z
  `),

  nearWing: new P(`
    M -17 5 L 25 5 L 5 38
    C 3 41 -1 41 -4 38
    L -19 10 Z
  `),

  pylon: new P(`
    M 3 8 L 15 7 L 13 15 L 5 16 Z
  `),

  engine: new P(`
    M -4 14
    C 1 11 13 11 19 13
    C 24 15 25 19 21 22
    C 16 25 3 25 -3 22
    C -7 20 -7 16 -4 14 Z
  `),

  cockpit: new P(`
    M 35 -5
    C 42 -6 49 -4 54 -1
    L 58 2 L 45 1 L 35 0 Z
  `),

  frontDoor: new P(`
    M 29 -2 Q 29 -4 31 -4
    L 34 -4 Q 36 -4 36 -2
    L 36 7 Q 36 9 34 9
    L 31 9 Q 29 9 29 7 Z
  `),

  rearDoor: new P(`
    M -33 0 Q -33 -2 -31 -2
    L -28 -2 Q -26 -2 -26 0
    L -26 8 Q -26 10 -28 10
    L -31 10 Q -33 10 -33 8 Z
  `),
});

type JetPaths = ReturnType<typeof createJetPaths>;

let cachedJetPaths: JetPaths | null = null;

const getJetPaths = (): JetPaths | null => {
  const PathConstructor = (
    globalThis as typeof globalThis & {
      Path2D?: typeof Path2D;
    }
  ).Path2D;

  if (typeof PathConstructor !== "function") {
    return null;
  }

  cachedJetPaths ??= createJetPaths(PathConstructor);
  return cachedJetPaths;
};

const drawPlane = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  frame: number,
) => {
  const paths = getJetPaths();

  if (!paths) {
    return;
  }
  const pulse = 0.75 + Math.sin(frame * 0.16) * 0.25;
  const trailWave = Math.sin(frame * 0.08) * 1.4;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Ajuste uniquement cette valeur pour modifier la taille.
  ctx.scale(0.88, 0.88);

  // Traînée du réacteur
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const trailGradient = ctx.createLinearGradient(-175, 0, -3, 0);
  trailGradient.addColorStop(0, "rgba(37, 211, 102, 0)");
  trailGradient.addColorStop(0.45, "rgba(37, 211, 102, 0.08)");
  trailGradient.addColorStop(0.8, "rgba(110, 255, 165, 0.3)");
  trailGradient.addColorStop(1, "rgba(220, 255, 232, 0.85)");

  ctx.strokeStyle = trailGradient;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.shadowColor = "#25d366";
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.moveTo(-175, 18 + trailWave);
  ctx.bezierCurveTo(
    -125,
    13 - trailWave,
    -55,
    20 + trailWave * 0.4,
    -4,
    18,
  );
  ctx.stroke();

  const coreGradient = ctx.createLinearGradient(-130, 0, -3, 0);
  coreGradient.addColorStop(0, "rgba(255,255,255,0)");
  coreGradient.addColorStop(0.7, "rgba(220,255,232,0.15)");
  coreGradient.addColorStop(1, "rgba(255,255,255,0.9)");

  ctx.strokeStyle = coreGradient;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(-130, 18 - trailWave * 0.3);
  ctx.bezierCurveTo(-80, 17, -35, 19, -4, 18);
  ctx.stroke();

  ctx.restore();

  // Ombre générale de l’avion
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(37, 211, 102, 0.75)";
  ctx.shadowBlur = 22;
  ctx.fill(paths.body);
  ctx.restore();

  // Aile arrière
  const farWingGradient = ctx.createLinearGradient(0, -30, 0, 4);
  farWingGradient.addColorStop(0, "#0d7438");
  farWingGradient.addColorStop(0.55, "#159447");
  farWingGradient.addColorStop(1, "#1ec45c");

  ctx.fillStyle = farWingGradient;
  ctx.fill(paths.farWing);

  ctx.strokeStyle = "rgba(151, 255, 188, 0.5)";
  ctx.lineWidth = 0.8;
  ctx.stroke(paths.farWing);

  // Stabilisateur arrière
  const stabilizerGradient = ctx.createLinearGradient(-40, 2, -20, 17);
  stabilizerGradient.addColorStop(0, "#15803d");
  stabilizerGradient.addColorStop(1, "#22c55e");

  ctx.fillStyle = stabilizerGradient;
  ctx.fill(paths.rearStabilizer);

  // Dérive verticale
  const tailGradient = ctx.createLinearGradient(-48, -26, -25, 5);
  tailGradient.addColorStop(0, "#24d366");
  tailGradient.addColorStop(0.55, "#16a34a");
  tailGradient.addColorStop(1, "#0d7438");

  ctx.fillStyle = tailGradient;
  ctx.fill(paths.tailFin);

  ctx.strokeStyle = "rgba(220, 255, 232, 0.45)";
  ctx.lineWidth = 0.9;
  ctx.stroke(paths.tailFin);

  // Symbole sur la dérive
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(-44, -17);
  ctx.lineTo(-39, -7);
  ctx.lineTo(-31, -17);
  ctx.stroke();

  // Fuselage principal
  const bodyGradient = ctx.createLinearGradient(0, -10, 0, 14);
  bodyGradient.addColorStop(0, "#ffffff");
  bodyGradient.addColorStop(0.28, "#f4fff7");
  bodyGradient.addColorStop(0.58, "#dff7e7");
  bodyGradient.addColorStop(1, "#9fcdb0");

  ctx.fillStyle = bodyGradient;
  ctx.fill(paths.body);

  ctx.strokeStyle = "rgba(82, 190, 121, 0.75)";
  ctx.lineWidth = 1;
  ctx.stroke(paths.body);

  // Partie inférieure verte du fuselage
  const bellyGradient = ctx.createLinearGradient(0, 3, 0, 14);
  bellyGradient.addColorStop(0, "rgba(37, 211, 102, 0.3)");
  bellyGradient.addColorStop(0.35, "#22c55e");
  bellyGradient.addColorStop(1, "#087333");

  ctx.fillStyle = bellyGradient;
  ctx.fill(paths.belly);

  // Ligne décorative latérale
  const stripeGradient = ctx.createLinearGradient(-50, 0, 60, 0);
  stripeGradient.addColorStop(0, "rgba(37,211,102,0.15)");
  stripeGradient.addColorStop(0.35, "#25d366");
  stripeGradient.addColorStop(1, "#11863e");

  ctx.strokeStyle = stripeGradient;
  ctx.lineWidth = 1.7;

  ctx.beginPath();
  ctx.moveTo(-47, 3.5);
  ctx.bezierCurveTo(-20, 2.8, 25, 2.5, 59, 0.8);
  ctx.stroke();

  // Aile principale
  const wingGradient = ctx.createLinearGradient(-10, 4, 5, 40);
  wingGradient.addColorStop(0, "#24d366");
  wingGradient.addColorStop(0.5, "#159947");
  wingGradient.addColorStop(1, "#075b2b");

  ctx.fillStyle = wingGradient;
  ctx.fill(paths.nearWing);

  ctx.strokeStyle = "rgba(197, 255, 216, 0.55)";
  ctx.lineWidth = 1;
  ctx.stroke(paths.nearWing);

  // Reflet sur l’aile
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 0.8;

  ctx.beginPath();
  ctx.moveTo(-12, 7);
  ctx.lineTo(21, 7);
  ctx.lineTo(3, 35);
  ctx.stroke();

  // Support du moteur
  ctx.fillStyle = "#0e7e39";
  ctx.fill(paths.pylon);

  // Réacteur
  const engineGradient = ctx.createLinearGradient(0, 11, 0, 25);
  engineGradient.addColorStop(0, "#f4fff7");
  engineGradient.addColorStop(0.28, "#bbf7d0");
  engineGradient.addColorStop(0.55, "#22c55e");
  engineGradient.addColorStop(1, "#096f33");

  ctx.fillStyle = engineGradient;
  ctx.fill(paths.engine);

  ctx.strokeStyle = "rgba(224,255,234,0.7)";
  ctx.lineWidth = 0.9;
  ctx.stroke(paths.engine);

  // Entrée d’air du réacteur
  ctx.save();
  ctx.translate(20, 18);

  ctx.fillStyle = "#07140c";
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.8, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const intakeGradient = ctx.createRadialGradient(-0.8, -1, 0, 0, 0, 3.6);
  intakeGradient.addColorStop(0, "#9effbd");
  intakeGradient.addColorStop(0.22, "#25d366");
  intakeGradient.addColorStop(0.35, "#12371f");
  intakeGradient.addColorStop(1, "#020704");

  ctx.fillStyle = intakeGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#dfffe9";
  ctx.beginPath();
  ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Cockpit
  const cockpitGradient = ctx.createLinearGradient(35, -5, 55, 2);
  cockpitGradient.addColorStop(0, "#173a2b");
  cockpitGradient.addColorStop(0.45, "#081d13");
  cockpitGradient.addColorStop(1, "#020805");

  ctx.fillStyle = cockpitGradient;
  ctx.fill(paths.cockpit);

  ctx.strokeStyle = "rgba(86, 255, 145, 0.55)";
  ctx.lineWidth = 0.7;
  ctx.stroke(paths.cockpit);

  // Séparations du cockpit
  ctx.strokeStyle = "rgba(187, 247, 208, 0.5)";
  ctx.lineWidth = 0.6;

  ctx.beginPath();
  ctx.moveTo(43, -5);
  ctx.lineTo(45, 1);
  ctx.moveTo(51, -3);
  ctx.lineTo(52, 1);
  ctx.stroke();

  // Fenêtres passagers
  const windowGradient = ctx.createLinearGradient(0, -2, 0, 3);
  windowGradient.addColorStop(0, "#193e2d");
  windowGradient.addColorStop(1, "#020805");

  ctx.fillStyle = windowGradient;
  ctx.strokeStyle = "rgba(37, 211, 102, 0.45)";
  ctx.lineWidth = 0.45;

  for (let windowX = -20; windowX <= 25; windowX += 7.5) {
    ctx.beginPath();
    ctx.ellipse(windowX, 0, 2.1, 1.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Portes
  ctx.strokeStyle = "rgba(14, 116, 55, 0.55)";
  ctx.lineWidth = 0.65;
  ctx.stroke(paths.frontDoor);
  ctx.stroke(paths.rearDoor);

  // Reflet supérieur du fuselage
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-31, -1.5);
  ctx.bezierCurveTo(-7, -4, 20, -7, 39, -6);
  ctx.stroke();

  // Feu au bout de l’aile
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = "#8affad";
  ctx.shadowColor = "#25d366";
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.arc(4, 38, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Feu de nez
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#9effbd";
  ctx.shadowBlur = 9;

  ctx.beginPath();
  ctx.arc(64, 3, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
};

const drawFireExplosion = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  crashFrame: number,
) => {
  const age = Math.max(0, frame - crashFrame);
  const fade = Math.max(0, 1 - age / 80);

  if (fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(x, y);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + age * 0.04;
    const d = 8 + (age * 0.6) + (i % 3) * 5;
    const r = Math.max(1, 14 - age * 0.15);
    ctx.fillStyle = `rgba(255, 60, 20, ${0.7 * fade})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + age * 0.025 + 0.5;
    const d = 5 + (age * 0.8) + (i % 4) * 8;
    const r = Math.max(1, 10 - age * 0.12);
    ctx.fillStyle = `rgba(255, 160, 20, ${0.65 * fade})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + age * 0.06;
    const d = 3 + (age * 0.5) + (i % 5) * 6;
    const r = Math.max(0.5, 6 - age * 0.08);
    ctx.fillStyle = `rgba(255, 220, 60, ${0.8 * fade})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + age * 0.015;
    const d = 12 + (age * 1.2) + (i % 3) * 12;
    const r = Math.max(0.5, 4 - age * 0.06);
    ctx.fillStyle = `rgba(180, 180, 180, ${0.3 * fade})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (age < 12) {
    const flashR = 40 + age * 8;
    const flashAlpha = Math.max(0, 0.5 - age * 0.04);
    const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
    flash.addColorStop(0, `rgba(255, 200, 50, ${flashAlpha})`);
    flash.addColorStop(0.5, `rgba(255, 100, 20, ${flashAlpha * 0.5})`);
    flash.addColorStop(1, "rgba(255, 50, 10, 0)");
    ctx.fillStyle = flash;
    ctx.fillRect(-flashR, -flashR, flashR * 2, flashR * 2);
  }

  ctx.restore();
};

export const FlightScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshot = useRef<SceneSnapshot>({
    roundState: "waiting",
    multiplier: 1,
    elapsed: 0,
  });

  const roundState = useGameStore((state) => state.roundState);
  const countdown = useGameStore((state) => state.countdown);
  const multiplier = useGameStore((state) => state.multiplier);
  const elapsed = useGameStore((state) => state.elapsed);
  const crashMultiplier = useGameStore((state) => state.crashMultiplier);
  const balance = useGameStore((state) => state.balance);
  const bets = useGameStore((state) => state.bets);

  useEffect(() => {
    snapshot.current = { roundState, multiplier, elapsed };
  }, [roundState, multiplier, elapsed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let prevRoundState: RoundState = "waiting";
    let localCrashFrame = 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const render = () => {
      frame += reduceMotion ? 0 : 1;
      const state = snapshot.current;
      ctx.clearRect(0, 0, width, height);

      if (state.roundState === "crashed" && prevRoundState !== "crashed") {
        localCrashFrame = frame;
      }
      prevRoundState = state.roundState;

      const background = ctx.createRadialGradient(
        width * 0.31,
        height * 0.76,
        5,
        width * 0.42,
        height * 0.58,
        width * 0.85,
      );
      background.addColorStop(0, "rgba(28, 94, 54, .43)");
      background.addColorStop(0.33, "rgba(10, 31, 21, .6)");
      background.addColorStop(1, "#050807");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(48, height - 44);
      ctx.rotate(-0.015 * frame);
      for (let ray = 0; ray < 22; ray += 1) {
        const angle = (ray / 22) * Math.PI * 1.08 - 1.38;
        ctx.strokeStyle =
          ray % 3 === 0
            ? "rgba(255, 184, 0, .045)"
            : "rgba(37, 211, 102, .038)";
        ctx.lineWidth = ray % 4 === 0 ? 16 : 7;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * width * 1.4, Math.sin(angle) * width * 1.4);
        ctx.stroke();
      }
      ctx.restore();

      const left = 54;
      const bottom = height - 42;
      ctx.font = "600 10px Arial";
      ctx.textBaseline = "middle";

      const REF_MAX_LOG = Math.log(500);
      const gridSteps = 5;
      const gridMax = Math.max(3, Math.pow(state.multiplier, 1.5));
      const gridLogMax = Math.log(gridMax);
      ctx.setLineDash([3, 7]);
      for (let i = 0; i <= gridSteps; i++) {
        const y = 22 + ((bottom - 22) / gridSteps) * i;
        const frac = 1 - i / gridSteps;
        const gridMult = Math.exp(frac * gridLogMax);
        ctx.strokeStyle = "rgba(190, 224, 201, .1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(width - 18, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(207, 227, 214, .48)";
        ctx.textAlign = "right";
        ctx.fillText(`${gridMult.toFixed(1)}x`, left - 10, y);
      }
      for (let i = 0; i <= 7; i += 1) {
        const x = left + ((width - left - 22) / 7) * i;
        ctx.strokeStyle = "rgba(190, 224, 201, .08)";
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      let progress: number;
      if (state.roundState === "flying" || state.roundState === "crashed" || state.roundState === "finished") {
        const rawLog = Math.log(Math.max(1, state.multiplier)) / REF_MAX_LOG;
        progress = clamp(rawLog * 1.1 + 0.02, 0.02, 0.94);
      } else {
        progress = 0;
      }
      const easedProgress = easeOutCubic(progress);

      const area = ctx.createLinearGradient(0, 30, 0, height);
      if (state.roundState === "crashed") {
        area.addColorStop(0, "rgba(255, 79, 79, .25)");
        area.addColorStop(0.42, "rgba(255, 60, 20, .12)");
        area.addColorStop(1, "rgba(255, 40, 10, .01)");
      } else {
        area.addColorStop(0, "rgba(255, 184, 0, .3)");
        area.addColorStop(0.42, "rgba(37, 211, 102, .28)");
        area.addColorStop(1, "rgba(37, 211, 102, .02)");
      }

      ctx.beginPath();
      ctx.moveTo(left + 10, bottom);
      for (let index = 0; index <= 80; index += 1) {
        const pointProgress = (index / 80) * easedProgress;
        const point = curvePoint(pointProgress, width, height);
        ctx.lineTo(point.x, point.y);
      }
      const endPoint = curvePoint(easedProgress, width, height);
      ctx.lineTo(endPoint.x, bottom);
      ctx.closePath();
      ctx.fillStyle = area;
      ctx.fill();

      const line = ctx.createLinearGradient(left, 0, width, 0);
      if (state.roundState === "crashed") {
        line.addColorStop(0, "#ff4f4f");
        line.addColorStop(1, "#ff7a21");
        ctx.shadowColor = "#ff4f4f";
      } else {
        line.addColorStop(0, "#25d366");
        line.addColorStop(0.65, "#b7f23a");
        line.addColorStop(1, "#ffb800");
        ctx.shadowColor = "#25d366";
      }
      ctx.shadowBlur = 14;
      ctx.strokeStyle = line;
      ctx.lineCap = "round";
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let index = 0; index <= 80; index += 1) {
        const point = curvePoint((index / 80) * easedProgress, width, height);
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (state.roundState === "crashed") {
        drawFireExplosion(ctx, endPoint.x, endPoint.y, frame, localCrashFrame);
      }

      if (state.roundState === "flying") {
        drawPlane(
          ctx,
          endPoint.x,
          endPoint.y,
          curveAngle(easedProgress, width, height),
          frame,
        );
      }

      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.18,
        width / 2,
        height / 2,
        width * 0.73,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,.48)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

    };

    let rafId = requestAnimationFrame(function loop() {
      render();
      rafId = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const isCountdown = roundState === "countdown" && countdown > 0;
  const isCrashed = roundState === "crashed";
  const isFlying = roundState === "flying";

  return (
    <section
      id="flight-scene"
      className={`flight-scene ${isCrashed ? "scene-crashed" : ""}`}
      aria-label="Scene de jeu Aviator"
    >
      <canvas ref={canvasRef} aria-hidden="true" />

      <div className="scene-topline">
        <span className={`scene-live-dot is-${roundState}`} />
        <span>{statusCopy[roundState]}</span>
        <span className="scene-separator" />
        <span>VINPARYE AVIATOR</span>
      </div>

      <div className="scene-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {isCountdown ? (
            <motion.div
              className="countdown-display"
              key={`count-${countdown}`}
              initial={{ opacity: 0, scale: 1.45 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.72 }}
              transition={{ duration: 0.28 }}
            >
              <small>TOUR DANS</small>
              <strong>{countdown}</strong>
            </motion.div>
          ) : isCrashed ? (
            <motion.div
              className="crashed-display"
              key="crashed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <small>CRASH A</small>
              <strong className="crash-value">
                {formatMultiplier(crashMultiplier ?? 1)}
              </strong>
            </motion.div>
          ) : (
            <motion.div
              className="coefficient-display"
              key="coefficient"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="coefficient-kicker">
                {isFlying ? "" : "EN ATTENTE"}
              </span>
              <strong className={isFlying ? "multiplier-live" : ""}>
                {formatMultiplier(multiplier)}
              </strong>
              <span className="coefficient-subline">
                {isFlying
                  ? "CASHOUT AVANT LE CRASH"
                  : "PLACEZ VOS PARIS"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="scene-readouts" aria-hidden="true">
        <span>
          SOLDE <strong>{balance.toLocaleString("fr-FR")} G</strong>
        </span>
        <span>
          PARI 01 <strong>{bets[0].status === "placed" ? `${bets[0].betAmount.toLocaleString("fr-FR")} G` : "—"}</strong>
        </span>
        <span>
          PARI 02 <strong>{bets[1].status === "placed" ? `${bets[1].betAmount.toLocaleString("fr-FR")} G` : "—"}</strong>
        </span>
      </div>
    </section>
  );
};
