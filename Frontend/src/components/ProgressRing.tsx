import React from "react";

interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 76,
  strokeWidth = 6,
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(0, value), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--track)"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-40"
        />
        {/* Fill circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <strong className="text-xs font-semibold leading-none text-[var(--ink)]">
          {Math.round(clampedValue)}%
        </strong>
        {label && (
          <span className="text-[9px] text-[var(--muted)] mt-0.5">{label}</span>
        )}
      </div>
    </div>
  );
};
