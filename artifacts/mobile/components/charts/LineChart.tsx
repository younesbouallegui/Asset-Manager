import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

export interface DataPoint {
  ts: number;
  value: number;
}


interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  unit?: string;
  threshold?: number;
  thresholdColor?: string;
  formatY?: (v: number) => string;
  formatX?: (ts: number) => string;
}

const PAD = { top: 10, right: 10, bottom: 26, left: 38 };

function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cp} ${pts[i - 1].y} ${cp} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

export function LineChart({
  data,
  width = 320,
  height = 150,
  color = "#4a90d9",
  unit = "%",
  threshold,
  thresholdColor = "#e53935",
  formatY = (v) => String(Math.round(v)),
  formatX = (ts) => {
    const d = new Date(ts);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  },
}: LineChartProps) {
  const { points, yMin, yMax, yTicks, xTicks, yScaleFn } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], yMin: 0, yMax: 100, yTicks: [], xTicks: [], yScaleFn: () => 0 };
    }
    const xMin = Math.min(...data.map((d) => d.ts));
    const xMax = Math.max(...data.map((d) => d.ts));
    const yMin = Math.min(...data.map((d) => d.value));
    const yMax = Math.max(...data.map((d) => d.value));
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const iW = width - PAD.left - PAD.right;
    const iH = height - PAD.top - PAD.bottom;

    const xS = (ts: number) => PAD.left + ((ts - xMin) / xRange) * iW;
    const yS = (v: number) => PAD.top + iH - ((v - yMin) / yRange) * iH;

    const points = data.map((d) => ({ x: xS(d.ts), y: yS(d.value), ts: d.ts, v: d.value }));

    const yTicks = [0, 0.5, 1].map((t) => ({
      v: yMin + t * yRange,
      y: yS(yMin + t * yRange),
    }));

    const xIndices = [0, Math.floor((data.length - 1) / 2), data.length - 1];
    const xTicks = xIndices.map((i) => ({ ts: data[i].ts, x: xS(data[i].ts) }));

    return { points, yMin, yMax, yTicks, xTicks, yScaleFn: yS };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#737380", fontFamily: "Inter_400Regular", fontSize: 12 }}>
          No history data
        </Text>
      </View>
    );
  }

  const line = smooth(points);
  const last = points[points.length - 1];
  const area = last
    ? `${line} L ${last.x} ${height - PAD.bottom} L ${points[0].x} ${height - PAD.bottom} Z`
    : "";

  const gId = `lc${color.replace(/#/g, "")}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {yTicks.map((t, i) => (
        <Line
          key={i}
          x1={PAD.left}
          y1={t.y}
          x2={width - PAD.right}
          y2={t.y}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
      ))}

      {threshold !== undefined && (
        <Line
          x1={PAD.left}
          y1={yScaleFn(threshold)}
          x2={width - PAD.right}
          y2={yScaleFn(threshold)}
          stroke={thresholdColor}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      <Path d={area} fill={`url(#${gId})`} stroke="none" />
      <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {yTicks.map((t, i) => (
        <SvgText key={i} x={PAD.left - 4} y={t.y + 4} textAnchor="end" fontSize={9} fill="#9d9d9d">
          {formatY(t.v)}
        </SvgText>
      ))}

      {xTicks.map((t, i) => (
        <SvgText key={i} x={t.x} y={height - 6} textAnchor="middle" fontSize={9} fill="#9d9d9d">
          {formatX(t.ts)}
        </SvgText>
      ))}

      {last && (
        <>
          <Circle cx={last.x} cy={last.y} r={3} fill={color} />
          <Rect
            x={Math.min(last.x + 5, width - PAD.right - 48)}
            y={Math.max(last.y - 16, PAD.top)}
            width={44}
            height={16}
            rx={4}
            fill="rgba(26,37,53,0.9)"
          />
          <SvgText
            x={Math.min(last.x + 27, width - PAD.right - 4)}
            y={Math.max(last.y - 4, PAD.top + 12)}
            textAnchor="middle"
            fontSize={10}
            fill={color}
          >
            {formatY(last.v)}{unit}
          </SvgText>
        </>
      )}
    </Svg>
  );
}
