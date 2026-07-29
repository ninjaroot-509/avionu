"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useGameStore } from "@/src/store/gameStore";
import type { RoundState } from "@/src/types/game";
import { clamp, formatMultiplier } from "@/src/utils/format";

interface SceneSnapshot {
  roundState: RoundState;
  multiplier: number;
  elapsed: number;
  countdown: number;
  startedAtMs: number;
  crashedAtMs: number | null;
  clockOffsetMs: number;
  animationSeed: string;
  animationProfile: Record<string, string | number>;
}

const statusCopy: Record<RoundState, string> = {
  waiting: "EN ATTENTE DU PROCHAIN TOUR",
  countdown: "TOUR COMMENCE BIENTOT",
  flying: "EN VOL",
  crashed: "CRASH!",
  finished: "EN ATTENTE DU PROCHAIN TOUR",
};

const smoothStep = (value: number) => {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

const stableSeed = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

const PLANE_SCALE_EVENT_OFFSETS = [5, 9, 18, 26] as const;
const PLANE_SCALE_AMPLITUDES = [0.055, 0.044, 0.065, 0.04, 0.05] as const;
const PLANE_SCALE_CYCLE_DURATION = 33;
const PLANE_SCALE_EVENT_DURATION = 3.4;

const getIrregularPlaneScale = (flightSeconds: number) => {
  if (flightSeconds < PLANE_SCALE_EVENT_OFFSETS[0]) return 1;

  const cycleTime = flightSeconds % PLANE_SCALE_CYCLE_DURATION;
  const cycleIndex = Math.floor(
    flightSeconds / PLANE_SCALE_CYCLE_DURATION,
  );

  let eventAge = Number.POSITIVE_INFINITY;
  let eventIndex = -1;

  for (
    let index = 0;
    index < PLANE_SCALE_EVENT_OFFSETS.length;
    index += 1
  ) {
    const age = cycleTime - PLANE_SCALE_EVENT_OFFSETS[index];
    if (age >= 0 && age < PLANE_SCALE_EVENT_DURATION) {
      eventAge = age;
      eventIndex = index;
      break;
    }
  }

  // The last 7-second interval ends at the boundary of the next cycle.
  if (
    eventIndex === -1 &&
    cycleIndex > 0 &&
    cycleTime < PLANE_SCALE_EVENT_DURATION
  ) {
    eventAge = cycleTime;
    eventIndex = PLANE_SCALE_AMPLITUDES.length - 1;
  }

  if (eventIndex === -1) return 1;

  const progress = eventAge / PLANE_SCALE_EVENT_DURATION;
  const smoothEnvelope = Math.sin(progress * Math.PI);
  const perspectiveBreath =
    Math.sin(progress * Math.PI * 2) * smoothEnvelope;
  const direction = (cycleIndex + eventIndex) % 2 === 0 ? 1 : -1;

  return (
    1 +
    perspectiveBreath *
      PLANE_SCALE_AMPLITUDES[eventIndex] *
      direction
  );
};

const drawCloud = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffe8d2";
  ctx.beginPath();
  ctx.ellipse(x, y, 34 * scale, 11 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(
    x + 29 * scale,
    y + scale,
    44 * scale,
    13 * scale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.ellipse(
    x - 25 * scale,
    y + 4 * scale,
    25 * scale,
    9 * scale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
};

const drawExplosion = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  age: number,
) => {
  const fade = Math.max(0, 1 - age / 120);
  if (fade <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = fade;

  const shockRadius = 18 + age * 3;
  ctx.strokeStyle = `rgba(255, 245, 205, ${Math.max(0, 0.85 - age / 38)})`;
  ctx.lineWidth = Math.max(1, 8 - age * 0.14);
  ctx.beginPath();
  ctx.arc(0, 0, shockRadius, 0, Math.PI * 2);
  ctx.stroke();

  const flashRadius = 44 + age * 2.4;
  const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, flashRadius);
  flash.addColorStop(0, "rgba(255,255,235,.95)");
  flash.addColorStop(0.2, "rgba(255,203,55,.88)");
  flash.addColorStop(0.52, "rgba(255,70,18,.62)");
  flash.addColorStop(1, "rgba(255,35,10,0)");
  ctx.fillStyle = flash;
  ctx.fillRect(
    -flashRadius,
    -flashRadius,
    flashRadius * 2,
    flashRadius * 2,
  );

  for (let index = 0; index < 20; index += 1) {
    const angle = (index / 20) * Math.PI * 2 + age * 0.04;
    const distance = 8 + age * (0.8 + (index % 4) * 0.12);
    const radius = Math.max(2, 14 - age * 0.11);
    ctx.fillStyle =
      index % 2 === 0
        ? `rgba(255,92,18,${0.78 * fade})`
        : `rgba(255,194,42,${0.72 * fade})`;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2 + age * 0.018;
    const distance = 18 + age * 1.3 + (index % 3) * 9;
    ctx.fillStyle = `rgba(54,48,47,${0.35 * fade})`;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      Math.max(2, 10 - age * 0.05),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
};

export const FlightScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshot = useRef<SceneSnapshot>({
    roundState: "waiting",
    multiplier: 1,
    elapsed: 0,
    countdown: 0,
    startedAtMs: 0,
    crashedAtMs: null,
    clockOffsetMs: 0,
    animationSeed: "",
    animationProfile: {},
  });

  const roundState = useGameStore((state) => state.roundState);
  const countdown = useGameStore((state) => state.countdown);
  const multiplier = useGameStore((state) => state.multiplier);
  const elapsed = useGameStore((state) => state.elapsed);
  const crashMultiplier = useGameStore((state) => state.crashMultiplier);
  const currentRound = useGameStore((state) => state.currentRound);
  const clockOffsetMs = useGameStore((state) => state.clockOffsetMs);
  const playerCount = useGameStore(
    (state) =>
      (state.currentRound?.player_count ?? 0) +
      (state.currentRound?.bot_count ?? 0),
  );

  useEffect(() => {
    snapshot.current = {
      roundState,
      multiplier,
      elapsed,
      countdown,
      startedAtMs: currentRound?.started_at_ms ?? 0,
      crashedAtMs: currentRound?.crashed_at_ms ?? null,
      clockOffsetMs,
      animationSeed: currentRound?.animation_seed ?? "",
      animationProfile: currentRound?.animation_profile ?? {},
    };
  }, [
    roundState,
    multiplier,
    elapsed,
    countdown,
    currentRound,
    clockOffsetMs,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let resizeFrame = 0;
    let redrawAfterResize: (() => void) | null = null;
    let groundPlaneReady = false;
    let flightPlaneReady = false;
    let mainFlightPlaneReady = false;
    const groundPlaneImage = new Image();
    const flightPlaneImage = new Image();
    const mainFlightPlaneImage = new Image();
    groundPlaneImage.onload = () => {
      groundPlaneReady = true;
    };
    flightPlaneImage.onload = () => {
      flightPlaneReady = true;
    };
    mainFlightPlaneImage.onload = () => {
      mainFlightPlaneReady = true;
    };
    groundPlaneImage.src = "/avionu-plane-ground.webp";
    flightPlaneImage.src = "/avionu-plane-flight.png";
    mainFlightPlaneImage.src = "/avionu-haiti-plane.png";

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      resizeFrame = 0;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const nextWidth = Math.max(1, rect.width);
      const nextHeight = Math.max(1, rect.height);
      const nextCanvasWidth = Math.round(nextWidth * dpr);
      const nextCanvasHeight = Math.round(nextHeight * dpr);

      if (
        canvas.width === nextCanvasWidth &&
        canvas.height === nextCanvasHeight &&
        Math.abs(width - nextWidth) < 0.1 &&
        Math.abs(height - nextHeight) < 0.1
      ) {
        return;
      }

      width = nextWidth;
      height = nextHeight;
      canvas.width = nextCanvasWidth;
      canvas.height = nextCanvasHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawAfterResize?.();
    };

    const scheduleResize = () => {
      if (resizeFrame !== 0) return;
      resizeFrame = requestAnimationFrame(resize);
    };

    const observer = new ResizeObserver(scheduleResize);
    observer.observe(canvas);
    scheduleResize();

    const render = () => {
      const state = snapshot.current;
      const isPreflight =
        state.roundState === "waiting" || state.roundState === "countdown";
      const showPlane = state.roundState !== "finished";
      const isInRound =
        state.roundState === "flying" || state.roundState === "crashed";
      const officialNow = Date.now() + state.clockOffsetMs;
      const interpolatedElapsed =
        state.roundState === "flying" && state.startedAtMs > 0
          ? Math.max(state.elapsed, officialNow - state.startedAtMs)
          : state.elapsed;
      const flightSeconds = isInRound ? interpolatedElapsed / 1000 : 0;
      const seedOffset = stableSeed(state.animationSeed);
      const cloudPattern = Number(
        state.animationProfile.cloud_pattern ?? 0,
      );
      const cameraShake = Number(
        state.animationProfile.camera_shake ?? 0,
      );
      const decorativeMotion = !reducedMotion;
      const takeoffProgress = smoothStep(flightSeconds / 4.4);
      const takeoffTravel =
        Math.min(flightSeconds, 4.4) * width * 0.072;
      const cruiseTravel =
        Math.max(0, flightSeconds - 4.4) * width * 0.032;
      const worldTravel = isInRound ? takeoffTravel + cruiseTravel : 0;

      ctx.clearRect(0, 0, width, height);

      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#8b536b");
      sky.addColorStop(0.34, "#d97d72");
      sky.addColorStop(0.68, "#f5ab6c");
      sky.addColorStop(1, "#f2bd78");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const wrap = (base: number, travel: number, span: number) => {
        const shifted = (base - travel) % span;
        return shifted < -span * 0.2 ? shifted + span : shifted;
      };

      drawCloud(
        ctx,
        wrap(
          width * (0.12 + seedOffset * 0.18),
          worldTravel * (0.07 + cloudPattern * 0.005),
          width * 1.35,
        ),
        height * 0.17,
        1.35,
        0.32,
      );
      drawCloud(
        ctx,
        wrap(
          width * (0.62 + seedOffset * 0.2),
          worldTravel * (0.1 + cloudPattern * 0.006),
          width * 1.45,
        ),
        height * 0.27,
        1.8,
        0.24,
      );
      drawCloud(
        ctx,
        wrap(
          width * (1.05 + seedOffset * 0.2),
          worldTravel * (0.14 + cloudPattern * 0.005),
          width * 1.5,
        ),
        height * 0.43,
        1.05,
        0.2,
      );

      const farOffset = -(worldTravel * 0.12) % (width * 0.74);
      const mountainGradient = ctx.createLinearGradient(
        0,
        height * 0.5,
        0,
        height,
      );
      mountainGradient.addColorStop(0, "#b96659");
      mountainGradient.addColorStop(1, "#874a46");
      ctx.fillStyle = mountainGradient;
      ctx.beginPath();
      ctx.moveTo(-width, height);
      for (let ridge = -1; ridge < 4; ridge += 1) {
        const x = farOffset + ridge * width * 0.74;
        ctx.lineTo(x, height * 0.77);
        ctx.lineTo(x + width * 0.17, height * 0.58);
        ctx.lineTo(x + width * 0.29, height * 0.7);
        ctx.lineTo(x + width * 0.43, height * 0.49);
        ctx.lineTo(x + width * 0.61, height * 0.74);
        ctx.lineTo(x + width * 0.74, height * 0.77);
      }
      ctx.lineTo(width * 2, height);
      ctx.closePath();
      ctx.fill();

      const ground = ctx.createLinearGradient(0, height * 0.7, 0, height);
      ground.addColorStop(0, "#d88952");
      ground.addColorStop(1, "#8d503c");
      ctx.fillStyle = ground;
      ctx.fillRect(0, height * 0.76, width, height * 0.24);

      const mesaOffset = -(worldTravel * 0.58) % (width * 0.62);
      for (let mesa = -1; mesa < 4; mesa += 1) {
        const x = mesaOffset + mesa * width * 0.62;
        const mesaWidth = width * 0.23;
        const mesaTop = height * (0.64 + (mesa % 2) * 0.035);
        ctx.fillStyle = mesa % 2 === 0 ? "#a95643" : "#97493f";
        ctx.beginPath();
        ctx.moveTo(x - mesaWidth * 0.18, height * 0.84);
        ctx.lineTo(x, mesaTop + height * 0.07);
        ctx.lineTo(x + mesaWidth * 0.17, mesaTop);
        ctx.lineTo(x + mesaWidth * 0.62, mesaTop);
        ctx.lineTo(x + mesaWidth * 0.82, mesaTop + height * 0.08);
        ctx.lineTo(x + mesaWidth, height * 0.84);
        ctx.closePath();
        ctx.fill();
      }

      const runwayY = height * 0.82;
      const runwayHeight = Math.max(58, height - runwayY + 2);
      const airportVisibility = isPreflight
        ? 1
        : Math.max(0, 1 - flightSeconds / 4.8);

      if (airportVisibility > 0) {
        ctx.save();
        ctx.globalAlpha = airportVisibility;
        ctx.fillStyle = "#41464b";
        ctx.fillRect(0, runwayY, width, runwayHeight);
        ctx.fillStyle = "rgba(239, 159, 103, 0.78)";
        ctx.fillRect(0, runwayY, width, 2);
        ctx.fillStyle = "#2c3034";
        ctx.fillRect(0, runwayY + 2, width, 2);
        ctx.fillStyle = "rgba(255,255,255,.58)";
        const runwayTravel = isInRound ? worldTravel * 2.35 : 0;
        for (
          let stripe = -(runwayTravel % 112);
          stripe < width + 112;
          stripe += 112
        ) {
          ctx.fillRect(stripe, runwayY + runwayHeight * 0.5, 54, 3);
        }
        ctx.restore();
      }

      if (isInRound && flightPlaneReady) {
        const trafficCycle = flightSeconds % 20;
        const distantOne =
          -90 + (trafficCycle / 20) * (width + 180);
        const distantTwo =
          -150 + (trafficCycle / 23) * (width + 240);
        const chaseTime = Math.max(0, trafficCycle - 5);
        const chaserX =
          -190 + (chaseTime / 12.5) * (width + 360);

        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.translate(distantOne + 33, height * 0.22 + 30);
        ctx.scale(-1, 1);
        ctx.drawImage(flightPlaneImage, -33, -30, 66, 60);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.translate(distantTwo + 24, height * 0.34 + 22);
        ctx.scale(-1, 1);
        ctx.drawImage(flightPlaneImage, -24, -22, 48, 44);
        ctx.restore();

        if (trafficCycle >= 5 && trafficCycle <= 18.5) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.translate(chaserX + 29, height * 0.285 + 27);
          ctx.scale(-1, 1);
          ctx.drawImage(flightPlaneImage, -29, -27, 58, 54);
          ctx.restore();
        }
      }

      const basePlaneWidth = isPreflight
        ? Math.min(350, Math.max(235, width * 0.22))
        : Math.min(560, Math.max(380, width * 0.34));
      const perspectiveScale =
        isInRound && decorativeMotion
          ? getIrregularPlaneScale(flightSeconds)
          : 1;
      const altitudeScale = isInRound
        ? 1 - smoothStep((takeoffProgress - 0.66) / 0.34) * 0.2
        : 1;
      const planeWidth =
        basePlaneWidth * perspectiveScale * altitudeScale;
      const planeHeight = isPreflight
        ? planeWidth * (532 / 840)
        : planeWidth * (340 / 1410);
      const activePlaneImage = isPreflight
        ? groundPlaneImage
        : mainFlightPlaneImage;
      const activePlaneReady = isPreflight
        ? groundPlaneReady
        : mainFlightPlaneReady;
      const planeX = isPreflight
        ? width * 0.34
        : width * (0.34 + takeoffProgress * 0.22);
      const planeY = isPreflight
        ? runwayY - planeHeight * 0.05
        : runwayY -
          planeHeight * 0.05 -
          takeoffProgress * height * 0.39;
      const planeAngle = isPreflight
        ? 0
        : -0.02 -
          Math.sin(takeoffProgress * Math.PI) * 0.14 +
          (decorativeMotion
            ? Math.sin(flightSeconds * 2.1 + seedOffset * Math.PI) *
              0.006 *
              (1 + cameraShake)
            : 0);
      const cruiseMotion = isInRound
        ? smoothStep((flightSeconds - 4.8) / 1.6)
        : 0;
      const planeBob =
        decorativeMotion
          ? Math.sin(flightSeconds * 0.92 + seedOffset * Math.PI * 2) *
            4.5 *
            (1 + cameraShake) *
            cruiseMotion
          : 0;

      if (state.roundState === "crashed") {
        drawExplosion(
          ctx,
          planeX + planeWidth * 0.27,
          planeY - planeHeight * 0.32 + planeBob,
          state.crashedAtMs
            ? Math.max(0, (officialNow - state.crashedAtMs) / (1000 / 60))
            : 0,
        );
      } else if (showPlane && activePlaneReady) {
        if (state.roundState === "flying") {
          const trailLength = width * (0.1 + takeoffProgress * 0.06);
          const trail = ctx.createLinearGradient(
            planeX - trailLength,
            0,
            planeX,
            0,
          );
          trail.addColorStop(0, "rgba(255,255,255,0)");
          trail.addColorStop(1, "rgba(255,235,210,.38)");
          ctx.strokeStyle = trail;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(planeX - trailLength, planeY + planeBob);
          ctx.lineTo(planeX - planeWidth * 0.35, planeY + planeBob);
          ctx.stroke();
        }

        ctx.save();
        ctx.translate(planeX, planeY + planeBob);
        ctx.rotate(planeAngle);
        if (isPreflight) ctx.scale(-1, 1);
        if (isPreflight) {
          ctx.drawImage(
            activePlaneImage,
            -planeWidth * 0.5,
            -planeHeight * 0.58,
            planeWidth,
            planeHeight,
          );
        } else {
          const sourceCropX = 30;
          const sourceCropY = 330;
          const sourceCropWidth = 1410;
          const sourceCropHeight = 340;
          const flagSourceWidth = 570;
          const staticSourceX = 590;
          const destinationLeft = -planeWidth * 0.5;
          const destinationTop = -planeHeight * 0.58;
          const horizontalScale = planeWidth / sourceCropWidth;
          const flagStripCount = 14;
          const flagStripWidth = flagSourceWidth / flagStripCount;

          for (
            let stripIndex = 0;
            stripIndex < flagStripCount;
            stripIndex += 1
          ) {
            const sourceX =
              sourceCropX + stripIndex * flagStripWidth;
            const freedom =
              1 - (stripIndex / (flagStripCount - 1)) * 0.76;
            const waveOffset = decorativeMotion
              ? (
                  Math.sin(flightSeconds * 1.35 - stripIndex * 0.56) *
                    0.052 +
                  Math.sin(flightSeconds * 0.62 + stripIndex * 0.31) *
                    0.017
                ) *
                planeHeight *
                freedom
              : 0;
            const waveStretch = decorativeMotion
              ? 1 +
                Math.sin(flightSeconds * 1.05 - stripIndex * 0.42) *
                  0.018 *
                  freedom
              : 1;

            ctx.drawImage(
              activePlaneImage,
              sourceX,
              sourceCropY,
              flagStripWidth + 1,
              sourceCropHeight,
              destinationLeft +
                (sourceX - sourceCropX) * horizontalScale,
              destinationTop + waveOffset,
              flagStripWidth * horizontalScale + 1,
              planeHeight * waveStretch,
            );
          }

          ctx.drawImage(
            activePlaneImage,
            staticSourceX,
            sourceCropY,
            850,
            sourceCropHeight,
            destinationLeft +
              (staticSourceX - sourceCropX) * horizontalScale,
            destinationTop,
            850 * horizontalScale,
            planeHeight,
          );
        }
        ctx.restore();
      }

      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.25,
        width / 2,
        height / 2,
        width * 0.82,
      );
      vignette.addColorStop(0, "rgba(255,255,255,0)");
      vignette.addColorStop(1, "rgba(38,17,25,.26)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    redrawAfterResize = render;

    let animationFrame = requestAnimationFrame(function loop() {
      render();
      animationFrame = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      if (resizeFrame !== 0) cancelAnimationFrame(resizeFrame);
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
      aria-label="Scène de jeu Avionu"
    >
      <canvas ref={canvasRef} aria-hidden="true" />

      <div className="scene-topline">
        <span className={`scene-live-dot is-${roundState}`} />
        <span>{statusCopy[roundState]}</span>
        <span className="scene-separator" />
        <span>AVIONU</span>
      </div>

      <div
        className={`scene-center ${
          !isFlying && !isCountdown && !isCrashed
            ? "is-waiting"
            : ""
        }`}
        aria-live="polite"
      >
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
              <span
                className={`coefficient-kicker ${
                  isFlying ? "" : "is-waiting"
                }`}
              >
                {isFlying ? "" : "EN ATTENTE"}
              </span>
              {isFlying && (
                <strong className="multiplier-live">
                  {formatMultiplier(multiplier)}
                </strong>
              )}
              <span className="coefficient-subline">
                {isFlying ? " MULTIPLICATEUR EN DIRECT" : "PLACEZ VOS PARIS"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="scene-readouts" aria-hidden="true">
        <span className="scene-online-pill">
          <i />
          <strong>{playerCount} joueurs</strong>
        </span>
      </div>
    </section>
  );
};
