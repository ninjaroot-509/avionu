"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/src/store/gameStore";
import { formatGourdes, formatMultiplier } from "@/src/utils/format";

const NAMES = [
  "Jean-Louis", "Marie-Claire", "Pierre", "Sophia", "Reginald",
  "Kerly", "Steevenson", "Woodby", "Josue", "Markendy",
  "Abner", "Roselaine", "Jefferson", "Princesse", "Lubens",
  "Samuel", "Manoucheka", "Dumel", "Widsong", "Sherson",
  "Roney", "Berson", "Clérmis", "Tatiana", "Otman",
  "Evens", "Fernanda", "Jhonson", "Mirlande", "Ricardo",
  "Widel", "Montana", "Bébert", "Tchimy", "Rosana",
  "Savannah", "Kervens", "Jemima", "Frantz", "Daphnie",
];

interface PlayerEntry {
  id: string;
  name: string;
  status: "bet" | "cashout" | "lost";
  amount: number;
  multiplier: number | null;
  winAmount: number;
  timestamp: number;
}

let actionId = 0;

const randomName = () => NAMES[Math.floor(Math.random() * NAMES.length)];
const randomBet = () => {
  const r = Math.random();
  if (r < 0.3) return 50 + Math.floor(Math.random() * 5) * 50;
  if (r < 0.6) return 100 + Math.floor(Math.random() * 10) * 50;
  if (r < 0.85) return 500 + Math.floor(Math.random() * 20) * 50;
  return 1000 + Math.floor(Math.random() * 50) * 100;
};

export const PlayerSidebar = () => {
  const [entries, setEntries] = useState<PlayerEntry[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const roundState = useGameStore((state) => state.roundState);
  const activeRound = useRef(false);
  const pendingBets = useRef<{ name: string; amount: number; id: string }[]>([]);
  const cashedOut = useRef<Set<string>>(new Set());
  const [playerCount] = useState(() => 24 + Math.floor(Math.random() * 12));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (roundState === "flying" && !activeRound.current) {
      activeRound.current = true;
      cashedOut.current.clear();

      const numBets = 3 + Math.floor(Math.random() * 5);
      pendingBets.current = Array.from({ length: numBets }, () => {
        const id = `p-${++actionId}`;
        return { name: randomName(), amount: randomBet(), id };
      });

      setEntries(
        pendingBets.current.map((bet) => ({
          id: bet.id,
          name: bet.name,
          status: "bet" as const,
          amount: bet.amount,
          multiplier: null,
          winAmount: 0,
          timestamp: Date.now(),
        }))
      );

      pendingBets.current.forEach((bet, i) => {
        const tid = setTimeout(() => {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === bet.id ? { ...e, timestamp: Date.now() } : e
            )
          );
        }, i * (200 + Math.random() * 400));
        timeoutsRef.current.push(tid);
      });
    }

    if (roundState === "crashed" && activeRound.current) {
      activeRound.current = false;
      const crashMult = useGameStore.getState().crashMultiplier;

      setEntries((prev) =>
        prev.map((e) =>
          e.status === "bet"
            ? { ...e, status: "lost" as const, multiplier: crashMult, winAmount: 0 }
            : e
        )
      );
      pendingBets.current = [];
    }

    if (roundState === "waiting" || roundState === "finished") {
      activeRound.current = false;
      pendingBets.current = [];
    }
  }, [roundState]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (roundState !== "flying") return;

    intervalRef.current = setInterval(() => {
      const currentMult = useGameStore.getState().multiplier;
      pendingBets.current.forEach((bet) => {
        if (cashedOut.current.has(bet.id)) return;
        if (currentMult < 1.2) return;

        const threshold = 1.2 + Math.random() * 3.5;
        if (currentMult >= threshold) {
          cashedOut.current.add(bet.id);
          const win = Math.round(bet.amount * currentMult);
          setEntries((prev) =>
            prev.map((e) =>
              e.id === bet.id
                ? { ...e, status: "cashout" as const, multiplier: currentMult, winAmount: win }
                : e
            )
          );
        }
      });
    }, 300);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [roundState]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [entries.length]);

  return (
    <aside className="player-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-dot" />
        <span>Joueurs en ligne</span>
        <span className="sidebar-count" suppressHydrationWarning>{playerCount}</span>
      </div>

      <div className="sidebar-table-header">
        <span className="sh-name">Joueur</span>
        <span className="sh-cote">Cote</span>
        <span className="sh-pari">Pari</span>
        <span className="sh-gain">Gain</span>
      </div>

      <div className="sidebar-list" ref={listRef}>
        {entries.length === 0 && (
          <div className="sidebar-empty">
            En attente du prochain tour...
          </div>
        )}
        {entries.map((entry) => (
          <div
            className={`sidebar-row is-${entry.status}`}
            key={entry.id}
          >
            <span className="sb-name">{entry.name}</span>
            <span className="sb-cote">
              {entry.multiplier != null
                ? formatMultiplier(entry.multiplier)
                : "—"}
            </span>
            <span className="sb-pari">{formatGourdes(entry.amount)}</span>
            <span className={`sb-gain ${entry.status === "lost" ? "is-lost" : entry.status === "cashout" ? "is-win" : ""}`}>
              {entry.status === "lost"
                ? "0"
                : entry.status === "cashout"
                  ? formatGourdes(entry.winAmount)
                  : "—"}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
};
