import React, { useState } from "react";
import { ArrowRight, Plus, MoreHorizontal, Eye, EyeOff, Search, Volume2, Sun, Check, X, ShieldAlert, Sparkles, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";
import { useToast } from "../Toast";
import { ProgressRing } from "../ProgressRing";

export const ComponentsSpecimenView: React.FC = () => {
  const { toast } = useToast();

  // Inputs
  const [showPassword, setShowPassword] = useState(false);
  const [sliderVal, setSliderVal] = useState(72);
  const [volumeVal, setVolumeVal] = useState(50);
  const [brightnessVal, setBrightnessVal] = useState(100);

  // Switches
  const [switch1, setSwitch1] = useState(true);
  const [switch2, setSwitch2] = useState(false);

  // Checkboxes & Radios
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(true);
  const [radioChoice, setRadioChoice] = useState("selected");

  // Select
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [selectOpen, setSelectOpen] = useState(false);

  // Tabs
  const [activeSpecimenTab, setActiveSpecimenTab] = useState("overview");

  // Calendar demo
  const [selectedDay, setSelectedDay] = useState(15);

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="p-6 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-gradient)]">
        <p className="text-[10px] tracking-[4px] uppercase font-mono text-[var(--muted)] mb-1">
          UI / UX DESIGN SYSTEM SPECIMEN
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-normal text-[var(--ink)]">
          Components for Modern Interfaces
        </h2>
        <p className="text-xs text-[var(--muted)] mt-1">
          Curated interactive collection matching the reference sheet. All native CSS variables, typography, states, and luxury finishes.
        </p>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Section 02: Buttons */}
        <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
            <span className="font-display text-sm text-[var(--muted)]">02</span>
            <h3 className="font-display text-base font-normal">Buttons</h3>
          </div>

          <div className="space-y-3">
            {/* Primary, Secondary, Ghost */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toast("Primary Button Clicked", "success")}
                className="primary-btn flex items-center justify-between gap-2 px-4 py-2 rounded-md text-xs font-medium"
              >
                <span>Primary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => toast("Secondary Action", "info")}
                className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-hover)] text-xs transition-colors"
              >
                Secondary
              </button>

              <button
                onClick={() => toast("Ghost Action", "info")}
                className="px-3 py-2 rounded-md text-[var(--muted)] hover:text-[var(--ink)] text-xs transition-colors"
              >
                Ghost
              </button>
            </div>

            {/* Danger, Add, More */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toast("Danger Action Triggered", "error")}
                className="danger-badge px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              >
                Danger
              </button>

              <button
                onClick={() => toast("Item Added", "success")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>

              <button
                onClick={() => toast("More Menu Opened", "info")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                More
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 03: Search & Input */}
        <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
            <span className="font-display text-sm text-[var(--muted)]">03</span>
            <h3 className="font-display text-base font-normal">Search & Input</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)]">
              <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] placeholder-[var(--muted)]"
              />
              <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-solid)] border border-[var(--line)] text-[var(--muted)]">
                ⌘ K
              </kbd>
            </div>

            {/* Standard Text */}
            <div className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)]">
              <input
                type="text"
                placeholder="Enter text..."
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] placeholder-[var(--muted)]"
              />
            </div>

            {/* Password with Eye */}
            <div className="flex items-center justify-between px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)]">
              <input
                type={showPassword ? "text" : "password"}
                defaultValue="void-menu-secure"
                className="w-full bg-transparent border-0 outline-none text-[var(--ink)] placeholder-[var(--muted)] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[var(--muted)] hover:text-[var(--ink)] ml-2"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Section 04: Dropdown / Select */}
        <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
            <span className="font-display text-sm text-[var(--muted)]">04</span>
            <h3 className="font-display text-base font-normal">Dropdown / Select</h3>
          </div>

          <div className="relative text-xs">
            <button
              type="button"
              onClick={() => setSelectOpen(!selectOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-[var(--border-soft)] bg-[var(--panel-gradient)] text-[var(--ink)] font-medium shadow-sm"
            >
              <span>{selectedCategory}</span>
              <span className="text-[10px] text-[var(--muted)]">▼</span>
            </button>

            {selectOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-md border border-[var(--border)] bg-[var(--panel-gradient)] shadow-lg z-20 space-y-0.5">
                {["General", "Personal", "Design", "Development", "Advanced"].map((cat) => (
                  <div
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectOpen(false);
                      toast(`Selected: ${cat}`, "info");
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                      selectedCategory === cat
                        ? "bg-[var(--selection)] font-medium text-[var(--ink)]"
                        : "hover:bg-[var(--surface-hover)] text-[var(--muted)]"
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Check className="w-3 h-3 text-[var(--accent)]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 05: Toggles & Switches */}
        <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
            <span className="font-display text-sm text-[var(--muted)]">05</span>
            <h3 className="font-display text-base font-normal">Toggles & Switches</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Tactile Switch Row */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSwitch1(!switch1)}
                className={`w-16 h-7 rounded-pill relative border transition-all ${
                  switch1
                    ? "bg-[var(--accent)] border-[var(--accent-bright)] text-white"
                    : "bg-[var(--surface)] border-[var(--border-soft)] text-[var(--muted)]"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full transition-transform ${
                    switch1
                      ? "right-1 bg-white shadow-sm"
                      : "left-1 bg-gray-400"
                  }`}
                />
                <span className="text-[10px] uppercase font-mono px-2">
                  {switch1 ? "ON" : "OFF"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSwitch2(!switch2)}
                className={`w-16 h-7 rounded-pill relative border transition-all ${
                  switch2
                    ? "bg-[var(--accent)] border-[var(--accent-bright)] text-white"
                    : "bg-[var(--surface)] border-[var(--border-soft)] text-[var(--muted)]"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full transition-transform ${
                    switch2
                      ? "right-1 bg-white shadow-sm"
                      : "left-1 bg-gray-400"
                  }`}
                />
                <span className="text-[10px] uppercase font-mono px-2">
                  {switch2 ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            {/* Checkboxes */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--border-soft)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={check1}
                  onChange={(e) => setCheck1(e.target.checked)}
                  className="rounded accent-[var(--accent)]"
                />
                <span>Checkbox option</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={check2}
                  onChange={(e) => setCheck2(e.target.checked)}
                  className="rounded accent-[var(--accent)]"
                />
                <span>Checkbox enabled</span>
              </label>
            </div>

            {/* Radio Stack */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--border-soft)]">
              {["option", "selected"].map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="specimen-radio"
                    value={r}
                    checked={radioChoice === r}
                    onChange={() => setRadioChoice(r)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="capitalize">Radio {r}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 06: Tags / Badges */}
        <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
            <span className="font-display text-sm text-[var(--muted)]">06</span>
            <h3 className="font-display text-base font-normal">Tags / Badges</h3>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-pill border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--ink)]">
              Default
            </span>
            <span className="success-badge px-3 py-1 rounded-pill flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
            <span className="info-badge px-3 py-1 rounded-pill">
              New
            </span>
            <span className="danger-badge px-3 py-1 rounded-pill">
              Important
            </span>
            <span className="warning-badge px-3 py-1 rounded-pill">
              Warning
            </span>
            <span className="px-3 py-1 rounded-pill border border-[var(--border-soft)] text-[var(--muted)] opacity-60">
              Disabled
            </span>
          </div>
        </div>

        {/* Section 07: Sliders & Controls */}
        <div className="p-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-gradient)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2">
            <span className="font-display text-sm text-[var(--muted)]">07</span>
            <h3 className="font-display text-base font-normal">Sliders & Controls</h3>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {/* Primary slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--muted)]">Percentage</span>
                <span>{sliderVal}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--track)] rounded-lg accent-[var(--accent)]"
              />
            </div>

            {/* Volume slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--muted)] flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Volume
                </span>
                <span>{volumeVal}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volumeVal}
                onChange={(e) => setVolumeVal(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--track)] rounded-lg accent-[var(--accent)]"
              />
            </div>

            {/* Brightness slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--muted)] flex items-center gap-1">
                  <Sun className="w-3 h-3" /> Brightness
                </span>
                <span>{brightnessVal}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={brightnessVal}
                onChange={(e) => setBrightnessVal(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--track)] rounded-lg accent-[var(--accent)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
