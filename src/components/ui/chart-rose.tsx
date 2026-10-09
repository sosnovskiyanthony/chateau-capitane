const SIZE = 600;
const CENTER = SIZE / 2;
// A portolan chart's 32 rhumb lines: 8 winds, 8 half-winds, 16 quarter-winds.
const LINE_COUNT = 32;

const lines = Array.from({ length: LINE_COUNT }, (_, index) => {
  const angle = (index / LINE_COUNT) * Math.PI * 2;
  return {
    x: Math.round((CENTER + Math.cos(angle) * CENTER) * 100) / 100,
    y: Math.round((CENTER + Math.sin(angle) * CENTER) * 100) / 100,
    principal: index % 4 === 0,
  };
});

/** Decorative rhumb-line rose, drawn in `currentColor`. Used once, in the home hero. */
export function ChartRose({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke">
        {lines.map((line, index) => (
          <line
            key={index}
            x1={CENTER}
            y1={CENTER}
            x2={line.x}
            y2={line.y}
            strokeWidth={line.principal ? 1 : 0.5}
            strokeOpacity={line.principal ? 0.6 : 0.32}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={CENTER * 0.26}
          strokeWidth={1}
          strokeOpacity={0.55}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={CENTER * 0.28}
          strokeWidth={0.5}
          strokeOpacity={0.35}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}
