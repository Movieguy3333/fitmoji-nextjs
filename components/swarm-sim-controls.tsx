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
      width="20"
      height="20"
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
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col">
          <span className="text-[0.73rem] font-black uppercase tracking-[0.14em] text-[#264653]">
            {label}
          </span>
          {sublabel && (
            <span className="text-[0.62rem] font-semibold text-[#264653]/55">
              {sublabel}
            </span>
          )}
        </div>
        <span className="text-[0.73rem] font-black tabular-nums text-[#2a9d8f]">
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
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#264653]/20 accent-[#2a9d8f] disabled:cursor-not-allowed"
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

  const fmtMult = (v: number) => `${v.toFixed(2)}×`;
  const fmtMs = (v: number) => `${v.toFixed(0)}ms`;
  const fmtPercent = (v: number) => `${(v*100).toFixed(0)}%`;
  const fmt = (v: number) => `${v.toFixed(0)}`;

  return (
    <div className="absolute right-5 top-5  sm:right-8 sm:top-8 flex flex-col items-end rounded-lg border border-white/45 bg-white/86 shadow-[0_14px_32px_rgba(8,16,24,0.18)] backdrop-blur-md">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Simulation settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#264653] transition hover:bg-white/30"
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
            ? "max-h-[800px] w-72 opacity-100"
            : "pointer-events-none max-h-0 w-0 opacity-0"
        }`}
      >
        <div ref={panelRef} className="w-72 p-4">
          <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#e76f51]">
            Simulation Controls
          </p>

          {swarmLocked && (
            <p className="mb-3 rounded-md bg-[#e76f51]/10 px-2.5 py-1.5 text-[0.63rem] font-black uppercase tracking-[0.15em] text-[#e76f51]">
              Controls locked during swarm
            </p>
          )}

          <div
            className={`flex flex-col gap-3 transition-opacity ${swarmLocked ? "pointer-events-none opacity-100" : ""}`}
          >
            <Slider
              label="Ijom Damage multiplier"
              sublabel="Enemies"
              value={value.ijomDamageMultiplier}
              min={0.25}
              max={5}
              step={0.25}
              display={fmtMult}
              onChange={(v) => set("ijomDamageMultiplier", v)}
              disabled={swarmLocked}
            />

            <Slider
              label="Ijom HP multiplier"
              sublabel="Enemies"
              value={value.ijomHpMultiplier}
              min={0.25}
              max={3}
              step={0.25}
              display={fmtMult}
              onChange={(v) => set("ijomHpMultiplier", v)}
              disabled={swarmLocked}
            />

            <Slider
              label="Tree Damage multiplier"
              sublabel="Allies"
              value={value.treeDamageMultiplier}
              min={0.25}
              max={5}
              step={0.25}
              display={fmtMult}
              onChange={(v) => set("treeDamageMultiplier", v)}
              disabled={swarmLocked}
            />

            <Slider
              label="Tree HP multiplier"
              sublabel="Allies"
              value={value.treeHpMultiplier}
              min={0.25}
              max={3}
              step={0.25}
              display={fmtMult}
              onChange={(v) => set("treeHpMultiplier", v)}
              disabled={swarmLocked}
            />

            <Slider
              label="Enemy speed"
              value={value.enemySpeedMultiplier}
              min={0.25}
              max={5}
              step={0.25}
              display={fmtMult}
              onChange={(v) => set("enemySpeedMultiplier", v)}
              disabled={swarmLocked}
            />

            <Slider
              label="Enemy spawn interval"
              value={value.enemySpawnIntervalMs}
              min={0}
              max={3000}
              step={50}
              display={fmtMs}
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
              label="Snow Ijom Spawn Chance"
              value={value.snowIjomSpawnChance}
              min={0}
              max={1}
              step={.01}
              display={fmtPercent}
              onChange={(v) => set("snowIjomSpawnChance", v)}
              disabled={swarmLocked}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
