import type { HistoryEntry } from "@/src/types/game";

const CRASHES = [
  1.42, 3.17, 1.08, 7.23, 1.95, 2.61, 1.12, 5.44, 1.73, 12.80,
  1.28, 2.09, 1.56, 4.31, 1.05, 3.88, 1.34, 8.15, 1.67, 2.44,
];

export const initialRoundHistory: HistoryEntry[] = CRASHES.map(
  (crashMultiplier, index) => ({
    id: `seed-${index}`,
    crashMultiplier,
  }),
);
