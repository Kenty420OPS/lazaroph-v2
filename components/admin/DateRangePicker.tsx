"use client";

export type DateRange = { from: string; to: string };

type Preset = "today" | "yesterday" | "last7" | "last30" | "custom";

export function getManilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00+08:00");
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function getPresetRange(preset: Exclude<Preset, "custom">): DateRange {
  const today = getManilaToday();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { from: yesterday, to: yesterday };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
  }
}

interface DateRangePickerProps {
  range: DateRange | null;
  onChange: (range: DateRange | null) => void;
}

export default function DateRangePicker({ range, onChange }: DateRangePickerProps) {
  const today = getManilaToday();
  const yesterday = addDays(today, -1);
  const last7 = addDays(today, -6);
  const last30 = addDays(today, -29);

  let activePreset: Preset | "all" = "all";
  if (!range) {
    activePreset = "all";
  } else if (range.from === today && range.to === today) {
    activePreset = "today";
  } else if (range.from === yesterday && range.to === yesterday) {
    activePreset = "yesterday";
  } else if (range.from === last7 && range.to === today) {
    activePreset = "last7";
  } else if (range.from === last30 && range.to === today) {
    activePreset = "last30";
  } else {
    activePreset = "custom";
  }

  const handlePreset = (preset: Exclude<Preset, "custom">) => {
    onChange(getPresetRange(preset));
  };

  const handleCustom = () => {
    if (!range) {
      onChange({ from: today, to: today });
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  const presets: { key: Exclude<Preset, "custom">; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last7", label: "Last 7 days" },
    { key: "last30", label: "Last 30 days" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleClear}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
          activePreset === "all"
            ? "bg-white text-black border-white"
            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
        }`}
      >
        All time
      </button>
      {presets.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => handlePreset(p.key)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
            activePreset === p.key
              ? "bg-white text-black border-white"
              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        onClick={handleCustom}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
          activePreset === "custom"
            ? "bg-white text-black border-white"
            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
        }`}
      >
        Custom
      </button>
      {activePreset === "custom" && (
        <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          <input
            type="date"
            value={range?.from || ""}
            onChange={(e) => onChange({ from: e.target.value, to: range?.to || e.target.value })}
            className="bg-black border border-neutral-800 text-white text-xs px-2 py-1 rounded"
          />
          <span className="text-neutral-500 text-xs font-mono">to</span>
          <input
            type="date"
            value={range?.to || ""}
            onChange={(e) => onChange({ from: range?.from || e.target.value, to: e.target.value })}
            className="bg-black border border-neutral-800 text-white text-xs px-2 py-1 rounded"
          />
        </div>
      )}
    </div>
  );
}
