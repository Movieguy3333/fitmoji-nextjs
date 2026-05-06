'use client';

import { useEffect, useRef, useState } from 'react';

import type { SimControls } from '@/lib/swarm-village/sim/useSwarmSimulation';

type Props = {
  value: SimControls;
  onChange: (next: SimControls) => void;
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-[0.73rem] font-black uppercase tracking-[0.14em] text-[#264653]">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2a9d8f] ${
          checked ? 'bg-[#2a9d8f]' : 'bg-[#264653]/25'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.73rem] font-black uppercase tracking-[0.14em] text-[#264653]">
          {label}
        </span>
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
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#264653]/20 accent-[#2a9d8f]"
      />
    </div>
  );
}

function SegmentGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.73rem] font-black uppercase tracking-[0.14em] text-[#264653]">
        {label}
      </span>
      <div className="flex rounded-md border border-[#264653]/20 bg-[#264653]/8 p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded py-1 text-[0.7rem] font-black uppercase tracking-[0.12em] transition-colors ${
              value === opt.value
                ? 'bg-white text-[#264653] shadow-sm'
                : 'text-[#264653]/60 hover:text-[#264653]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SwarmSimControls({ value, onChange }: Props) {
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
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const set = <K extends keyof SimControls>(key: K, val: SimControls[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="absolute right-5 top-5 z-[950] sm:right-8 sm:top-8">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Simulation settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/45 bg-white/86 text-[#264653] shadow-[0_14px_32px_rgba(8,16,24,0.18)] backdrop-blur-md transition hover:bg-white"
      >
        <GearIcon />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 w-72 rounded-lg border border-white/45 bg-[#fffefa]/88 p-4 shadow-[0_24px_70px_rgba(8,16,24,0.22)] backdrop-blur-md"
        >
          <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#e76f51]">
            Simulation Controls
          </p>

          <div className="flex flex-col gap-3">
            <Toggle
              label="Swarm active"
              checked={value.isSwarmActive}
              onChange={(v) => set('isSwarmActive', v)}
            />

            <Slider
              label="Wave size"
              value={value.waveSize}
              min={1}
              max={80}
              step={1}
              onChange={(v) => set('waveSize', v)}
            />

            <SegmentGroup
              label="Enemy kind"
              value={value.enemyKind}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'snow', label: 'Snow' },
              ]}
              onChange={(v) => set('enemyKind', v as SimControls['enemyKind'])}
            />

            <Slider
              label="Spawn interval"
              value={value.spawnIntervalMs}
              min={100}
              max={2000}
              step={50}
              display={(v) => `${v}ms`}
              onChange={(v) => set('spawnIntervalMs', v)}
            />

            <Toggle
              label="Crazy capy"
              checked={value.crazyCapyEnabled}
              onChange={(v) => set('crazyCapyEnabled', v)}
            />

            <Slider
              label="Walkers"
              value={value.walkerCount}
              min={0}
              max={20}
              step={1}
              onChange={(v) => set('walkerCount', v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
