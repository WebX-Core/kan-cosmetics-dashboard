"use client";

import { useMemo } from "react";

export interface FunnelStage {
  label: string;
  value: number;
}

export interface FunnelChartProps {
  data: FunnelStage[];
  /** Base color for the lightest (first) stage, as an [r,g,b] tuple */
  startColor?: [number, number, number];
  /** Base color for the darkest (last) stage, as an [r,g,b] tuple */
  endColor?: [number, number, number];
  /** Overall chart height in px */
  height?: number;
  /** Locale used for number/percent formatting */
  locale?: string;
  /** Wrap the chart in a card (white bg, border, rounded corners) */
  card?: boolean;
  showStageLabels?: boolean;
  className?: string;
}

const DEFAULT_START: [number, number, number] = [220, 237, 253];
const DEFAULT_END: [number, number, number] = [25, 118, 217];

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgb([r, g, b]: [number, number, number]) {
  return `rgb(${r},${g},${b})`;
}

export default function FunnelChart({
  data,
  startColor = DEFAULT_START,
  endColor = DEFAULT_END,
  height = 380,
  locale = "en-US",
  card = true,
  showStageLabels = true,
  className,
}: FunnelChartProps) {
  const W = 1200;
  const H = height;
  const n = data.length;

  const colW = W / Math.max(n, 1);
  const topY = H * 0.3;
  const botY = H * 0.92;
  const midY = (topY + botY) / 2;
  const maxHalfHeight = ((botY - topY) / 2) * 0.92;

  const maxVal = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data]
  );

  const stageColors = useMemo(
    () =>
      data.map((_, i) =>
        lerpColor(startColor, endColor, n > 1 ? i / (n - 1) : 0)
      ),
    [data, n, startColor, endColor]
  );

  // Slight curve so small values don't collapse to a sliver — mirrors the
  // gentle taper in the reference design rather than a strict linear scale.
  const halfHeight = (v: number) =>
    Math.pow(v / maxVal, 0.85) * maxHalfHeight;

  const pctFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }),
    [locale]
  );

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale),
    [locale]
  );

  if (n === 0) return null;

  const gradientId = (i: number) => `funnel-grad-${i}`;
  const shadowId = "funnel-pill-shadow";

  const svg = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: "block", overflow: "visible" }}
      role="img"
      aria-label={`Funnel chart: ${data
        .map((d) => `${d.label} ${numberFormatter.format(d.value)}`)
        .join(", ")}`}
    >
      <defs>
        {data.slice(0, -1).map((_, i) => (
          <linearGradient
            key={i}
            id={gradientId(i)}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={rgb(stageColors[i])} />
            <stop offset="100%" stopColor={rgb(stageColors[i + 1])} />
          </linearGradient>
        ))}
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="4"
            floodColor="#000000"
            floodOpacity="0.12"
          />
        </filter>
      </defs>

      {data.slice(0, -1).map((stage, i) => {
        const x0 = i * colW;
        const x1 = (i + 1) * colW;
        const hh0 = halfHeight(stage.value);
        const hh1 = halfHeight(data[i + 1].value);
        const topY0 = midY - hh0;
        const botY0 = midY + hh0;
        const topY1 = midY - hh1;
        const botY1 = midY + hh1;
        const cpx = (x0 + x1) / 2;

        const d = [
          `M ${x0} ${topY0}`,
          `C ${cpx} ${topY0}, ${cpx} ${topY1}, ${x1} ${topY1}`,
          `L ${x1} ${botY1}`,
          `C ${cpx} ${botY1}, ${cpx} ${botY0}, ${x0} ${botY0}`,
          "Z",
        ].join(" ");

        return <path key={i} d={d} fill={`url(#${gradientId(i)})`} />;
      })}

      {data.slice(1).map((_, i) => {
        const x = (i + 1) * colW;
        return (
          <line
            key={i}
            x1={x}
            y1={H * 0.04}
            x2={x}
            y2={H * 0.96}
            stroke="var(--funnel-divider, rgba(0,0,0,0.07))"
            strokeWidth={1}
          />
        );
      })}

      {showStageLabels &&
        data.map((stage, i) => {
          const labelX = i * colW + colW * 0.08;
          return (
            <g key={i}>
              <text
                x={labelX}
                y={H * 0.1}
                fontSize={H * 0.04}
                fill="var(--funnel-label, #6B6B68)"
                fontFamily="var(--font-sans, -apple-system, Inter, sans-serif)"
              >
                {stage.label}
              </text>
              <text
                x={labelX}
                y={H * 0.18}
                fontSize={H * 0.068}
                fontWeight={600}
                fill="var(--funnel-value, #161614)"
                fontFamily="var(--font-sans, -apple-system, Inter, sans-serif)"
              >
                {numberFormatter.format(stage.value)}
              </text>
            </g>
          );
        })}

      {data.slice(0, -1).map((stage, i) => {
        const x0 = i * colW;
        const x1 = (i + 1) * colW;
        const cx = (x0 + x1) / 2;
        const next = data[i + 1].value;
        const dropPct =
          stage.value === 0 ? 0 : ((stage.value - next) / stage.value) * 100;
        const sign = dropPct >= 0 ? "-" : "+";
        const label = `${sign}${pctFormatter.format(Math.abs(dropPct))}% \u2192`;

        const pillWidth = Math.max(58, label.length * 7.4);
        const pillHeight = H * 0.082;

        return (
          <g key={i} filter={`url(#${shadowId})`}>
            <rect
              x={cx - pillWidth / 2}
              y={midY - pillHeight / 2}
              width={pillWidth}
              height={pillHeight}
              rx={pillHeight / 2}
              fill="var(--funnel-pill-bg, #FFFFFF)"
              stroke="var(--funnel-pill-border, rgba(0,0,0,0.06))"
              strokeWidth={1}
            />
            <text
              x={cx}
              y={midY + H * 0.013}
              fontSize={H * 0.034}
              textAnchor="middle"
              fill="var(--funnel-label, #6B6B68)"
              fontFamily="var(--font-sans, -apple-system, Inter, sans-serif)"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );

  if (!card) {
    return <div className={className}>{svg}</div>;
  }

  return (
    <div
      className={className}
      style={{
        width: "100%",
        background: "var(--funnel-card-bg, #FFFFFF)",
        border: "1px solid var(--funnel-card-border, rgba(0,0,0,0.08))",
        borderRadius: 16,
        padding: "24px 16px 8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {svg}
    </div>
  );
}
