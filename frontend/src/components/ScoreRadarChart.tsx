/**
 * AI Interview Feedback MVP - Score Radar Chart Component
 *
 * Displays a radar/spider chart showing the 6 interview score categories.
 * Pure SVG implementation - no external charting library required.
 *
 * Author: Member 3 (Frontend)
 */

// ===========================================
// Types
// ===========================================

export interface ScoreRadarChartProps {
  scores: {
    content: number;
    delivery: number;
    communication: number;
    voice: number;
    confidence: number;
    structure: number;
  };
  size?: number;
  showLabels?: boolean;
}

// ===========================================
// Constants
// ===========================================

const CATEGORIES = [
  { key: "content", label: "Content", color: "#3B82F6" },
  { key: "delivery", label: "Delivery", color: "#22C55E" },
  { key: "communication", label: "Comm.", color: "#A855F7" },
  { key: "voice", label: "Voice", color: "#EAB308" },
  { key: "confidence", label: "Conf.", color: "#EF4444" },
  { key: "structure", label: "Struct.", color: "#14B8A6" },
] as const;

// ===========================================
// Helper Functions
// ===========================================

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function getScorePoints(
  scores: Record<string, number>,
  centerX: number,
  centerY: number,
  maxRadius: number
): string {
  const angleStep = 360 / CATEGORIES.length;

  const points = CATEGORIES.map((cat, index) => {
    const score = scores[cat.key] || 0;
    const normalizedRadius = (score / 100) * maxRadius;
    const angle = index * angleStep;
    const point = polarToCartesian(centerX, centerY, normalizedRadius, angle);
    return `${point.x},${point.y}`;
  });

  return points.join(" ");
}

// ===========================================
// Component
// ===========================================

export default function ScoreRadarChart({
  scores,
  size = 300,
  showLabels = true,
}: ScoreRadarChartProps) {
  const center = size / 2;
  const maxRadius = size * 0.35;
  const labelRadius = size * 0.45;
  const angleStep = 360 / CATEGORIES.length;

  // Generate grid circles
  const gridLevels = [20, 40, 60, 80, 100];

  // Generate axis lines
  const axisLines = CATEGORIES.map((_, index) => {
    const angle = index * angleStep;
    const end = polarToCartesian(center, center, maxRadius, angle);
    return { x1: center, y1: center, x2: end.x, y2: end.y };
  });

  // Generate grid polygons
  const gridPolygons = gridLevels.map((level) => {
    const radius = (level / 100) * maxRadius;
    const points = CATEGORIES.map((_, index) => {
      const angle = index * angleStep;
      const point = polarToCartesian(center, center, radius, angle);
      return `${point.x},${point.y}`;
    }).join(" ");
    return points;
  });

  // Get score polygon points
  const scorePoints = getScorePoints(scores, center, center, maxRadius);

  // Get label positions
  const labelPositions = CATEGORIES.map((cat, index) => {
    const angle = index * angleStep;
    const pos = polarToCartesian(center, center, labelRadius, angle);
    return { ...cat, ...pos, score: Math.round(scores[cat.key] || 0) };
  });

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Grid circles */}
        {gridPolygons.map((points, index) => (
          <polygon
            key={`grid-${index}`}
            points={points}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}

        {/* Grid level labels */}
        {gridLevels.map((level) => {
          const radius = (level / 100) * maxRadius;
          return (
            <text
              key={`level-${level}`}
              x={center + 5}
              y={center - radius + 3}
              fontSize="10"
              fill="#9CA3AF"
            >
              {level}
            </text>
          );
        })}

        {/* Axis lines */}
        {axisLines.map((line, index) => (
          <line
            key={`axis-${index}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#D1D5DB"
            strokeWidth="1"
          />
        ))}

        {/* Score polygon fill */}
        <polygon
          points={scorePoints}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="#3B82F6"
          strokeWidth="2"
        />

        {/* Score points */}
        {CATEGORIES.map((cat, index) => {
          const score = scores[cat.key] || 0;
          const normalizedRadius = (score / 100) * maxRadius;
          const angle = index * angleStep;
          const point = polarToCartesian(
            center,
            center,
            normalizedRadius,
            angle
          );

          return (
            <circle
              key={`point-${cat.key}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={cat.color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}

        {/* Labels */}
        {showLabels &&
          labelPositions.map((label) => (
            <g key={`label-${label.key}`}>
              <text
                x={label.x}
                y={label.y - 8}
                fontSize="11"
                fontWeight="500"
                fill="#374151"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label.label}
              </text>
              <text
                x={label.x}
                y={label.y + 8}
                fontSize="12"
                fontWeight="bold"
                fill={label.color}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label.score}
              </text>
            </g>
          ))}
      </svg>

      {/* Score breakdown table */}
      <div className="mt-4 w-full grid grid-cols-2 gap-2 text-sm">
        {CATEGORIES.map((cat) => {
          const score = Math.round(scores[cat.key] || 0);
          const barWidth = `${score}%`;

          return (
            <div key={cat.key} className="flex items-center gap-2">
              <span className="w-16 text-gray-600">{cat.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: barWidth, backgroundColor: cat.color }}
                />
              </div>
              <span className="w-8 text-right font-medium">{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================
// Mini Chart Variant (for cards)
// ===========================================

interface MiniRadarChartProps {
  scores: {
    content: number;
    delivery: number;
    communication: number;
    voice: number;
    confidence: number;
    structure: number;
  };
}

export function MiniRadarChart({ scores }: MiniRadarChartProps) {
  const size = 80;
  const center = size / 2;
  const maxRadius = size * 0.4;
  const angleStep = 360 / CATEGORIES.length;

  const scorePoints = getScorePoints(scores, center, center, maxRadius);

  const gridPolygon = CATEGORIES.map((_, index) => {
    const angle = index * angleStep;
    const point = polarToCartesian(center, center, maxRadius, angle);
    return `${point.x},${point.y}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon
        points={gridPolygon}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="1"
      />
      <polygon
        points={scorePoints}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3B82F6"
        strokeWidth="1.5"
      />
    </svg>
  );
}
