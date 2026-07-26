import { clamp } from "@/src/utils/format";

export const easeOutCubic = (value: number) =>
  1 - Math.pow(1 - clamp(value, 0, 1), 3);

export const curvePoint = (
  progress: number,
  width: number,
  height: number,
) => {
  const x = 64 + progress * Math.max(0, width - 130);
  const usableHeight = Math.max(150, height - 96);
  const y =
    height -
    54 -
    Math.pow(clamp(progress, 0, 1), 1.72) * usableHeight * 0.84;

  return { x, y };
};

export const curveAngle = (
  progress: number,
  width: number,
  height: number,
) => {
  const a = curvePoint(Math.max(0, progress - 0.008), width, height);
  const b = curvePoint(Math.min(1, progress + 0.008), width, height);
  return Math.atan2(b.y - a.y, b.x - a.x);
};
