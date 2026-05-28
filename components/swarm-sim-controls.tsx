"use client";

import { useEffect, useRef, useState } from "react";

import type { SimControls } from "@/lib/swarm-village/sim/useSwarmSimulation";

type Props = {
  value: SimControls;
  onChange: (next: SimControls) => void;
  /** When true, all sliders are visually disabled and non-interactive. */
  swarmLocked: boolean;
};

function GearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function Slider({
  label,
  sublabel,
  value,
  min,
  max,
  step,
  display,
  onChange,
  disabled,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: (v: number) => string;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-col">
          <span className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#264653]">
            {label}
          </span>
          {sublabel && (
            <span className="text-[0.5rem] font-semibold text-[#264653]/55">
              {sublabel}
            </span>
          )}
        </div>
        <span className="shrink-0 text-[0.58rem] font-black tabular-nums text-[#2a9d8f]">
          {display ? display(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[#264653]/20 accent-[#2a9d8f] disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function SwarmSimControls({ value, onChange, swarmLocked }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const set = <K extends keyof SimControls>(key: K, val: SimControls[K]) =>
    onChange({ ...value, [key]: val });

  const fmtPercent = (v: number) => `${(v * 100).toFixed(0)}%`;
  const fmt = (v: number) => `${v.toFixed(0)}`;

  return (
    <div className="absolute right-5 top-5 sm:right-8 sm:top-8 flex flex-col items-end rounded-lg border border-white/45 bg-white/86 shadow-[0_14px_32px_rgba(8,16,24,0.18)] backdrop-blur-md">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Simulation settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-6 items-center justify-center rounded-lg text-[#264653] transition hover:bg-white/30"
      >
        <span
          className={`inline-block transition-transform duration-800 ease-out ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          <GearIcon />
        </span>
      </button>

      <div
        aria-hidden={!open}
        className={`overflow-hidden transition-all duration-500 ease-out ${
          open
            ? "max-h-[800px] w-48 opacity-100"
            : "pointer-events-none max-h-0 w-0 opacity-0"
        }`}
      >
        <div ref={panelRef} className="w-48 p-2">
          <p className="mb-1.5 text-[0.5rem] font-black uppercase tracking-[0.2em] text-[#e76f51]">
            Simulation Controls
          </p>

          {swarmLocked && (
            <p className="mb-1.5 rounded bg-[#e76f51]/10 px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.12em] text-[#e76f51]">
              Controls locked during swarm
            </p>
          )}

          <div
            className={`flex flex-col gap-2 transition-opacity ${swarmLocked ? "pointer-events-none opacity-40" : ""}`}
          >
            {/* ── Trees ── */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[0.48rem] font-black uppercase tracking-[0.18em] text-[#2a9d8f]">
                Trees
              </p>

              {/* Smart Fire toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#264653]">
                    Smart Fire
                  </span>
                  <span className="text-[0.5rem] font-semibold text-[#264653]/55">
                    Skip overkill shots
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={value.smartFire}
                  disabled={swarmLocked}
                  onClick={() => set("smartFire", !value.smartFire)}
                  className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                    value.smartFire ? "bg-[#2a9d8f]" : "bg-[#264653]/20"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      value.smartFire ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="border-t border-[#264653]/10" />

            {/* ── Enemies ── */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[0.48rem] font-black uppercase tracking-[0.18em] text-[#e76f51]">
                Enemies
              </p>

              <Slider
                label="Speed"
                value={value.enemySpeedMultiplier}
                min={0.25}
                max={5}
                step={0.25}
                onChange={(v) => set("enemySpeedMultiplier", v)}
                disabled={swarmLocked}
              />

              <Slider
                label="Spawn interval"
                value={value.enemySpawnIntervalMs}
                min={0}
                max={3000}
                step={50}
                onChange={(v) => set("enemySpawnIntervalMs", v)}
                disabled={swarmLocked}
              />

              <Slider
                label="Streak count"
                value={value.streakCount}
                min={1}
                max={50}
                step={1}
                display={fmt}
                onChange={(v) => set("streakCount", v)}
                disabled={swarmLocked}
              />

              <Slider
                label="Driller spawn chance"
                value={value.snowIjomSpawnChance}
                min={0}
                max={1}
                step={0.01}
                display={fmtPercent}
                onChange={(v) => set("snowIjomSpawnChance", v)}
                disabled={swarmLocked}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
