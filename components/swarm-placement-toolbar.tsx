"use client";

export type PlacementTool =
  | "boxer"
  | "tennis"
  | "quarterback"
  | "wall_stone"
  | "wall_wood"
  | "delete"
  | null;

type Props = {
  tool: PlacementTool;
  onToolChange: (t: PlacementTool) => void;
  onReset: () => void;
  disabled: boolean;
};

type ToolDef = {
  id: Exclude<PlacementTool, null>;
  label: string;
  sub: string;
  img?: string;
};

const TOOLS: ToolDef[] = [
  {
    id: "boxer",
    label: "Boxer",
    sub: "Melee",
    img: "/swarm-village/sprites/sudo_boxer_0.webp",
  },
  {
    id: "tennis",
    label: "Tennis",
    sub: "Ranged",
    img: "/swarm-village/sprites/sudo_tennis_0.webp",
  },
  {
    id: "quarterback",
    label: "Quarterback",
    sub: "Ranged",
    img: "/swarm-village/sprites/sudo-football.png",
  },
  {
    id: "wall_stone",
    label: "Stone Wall",
    sub: "Defense",
    img: "/swarm-village/quest/stone_wall.png",
  },
  {
    id: "wall_wood",
    label: "Wood Fence",
    sub: "Defense",
    img: "/swarm-village/quest/wood_fence.webp",
  },
  { id: "delete", label: "Delete", sub: "Erase" },
];

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function SwarmPlacementToolbar({
  tool,
  onToolChange,
  onReset,
  disabled,
}: Props) {
  function handleToolClick(id: Exclude<PlacementTool, null>) {
    onToolChange(tool === id ? null : id);
  }

  return (
    <div className="absolute left-5 top-16 z-[900] flex flex-col gap-1 rounded-lg border border-white/45 bg-white/86 p-1.5 shadow-[0_14px_32px_rgba(8,16,24,0.18)] backdrop-blur-md sm:left-8 sm:top-20">
      <p className="px-1 text-[0.55rem] font-black uppercase tracking-[0.18em] text-[#264653]">
        Place Units
      </p>

      {disabled && (
        <p className="rounded bg-[#e76f51]/10 px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.12em] text-[#e76f51]">
          Wave active
        </p>
      )}

      <div
        className={`flex flex-col gap-px transition-opacity ${disabled ? "pointer-events-none opacity-40" : ""}`}
      >
        {TOOLS.map(({ id, label, sub, img }) => {
          const isDelete = id === "delete";
          const selected = tool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleToolClick(id)}
              className={`flex items-center gap-1.5 rounded px-2 py-1 transition ${
                selected
                  ? isDelete
                    ? "bg-[#e76f51] text-white"
                    : "bg-[#2a9d8f] text-white"
                  : "text-[#264653] hover:bg-white/50"
              }`}
            >
              {isDelete ? (
                <TrashIcon />
              ) : img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt=""
                  draggable={false}
                  className="h-6 w-6 flex-shrink-0 object-contain"
                />
              ) : null}
              <span className="flex flex-col items-start leading-none">
                <span className="text-[0.62rem] font-black uppercase tracking-[0.08em]">
                  {label}
                </span>
                <span
                  className={`text-[0.5rem] font-semibold uppercase tracking-[0.06em] ${
                    selected ? "text-white/70" : "text-[#264653]/50"
                  }`}
                >
                  {sub}
                </span>
              </span>
            </button>
          );
        })}

        <div className="my-0.5 h-px bg-[#264653]/15" />

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#7b6f60] transition hover:bg-[#e76f51]/10 hover:text-[#e76f51]"
        >
          <ResetIcon />
          Reset
        </button>
      </div>
    </div>
  );
}
