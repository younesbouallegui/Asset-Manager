import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  filled?: boolean;
  strokeWidth?: number;
}

function buildPath(points: { x: number; y: number }[], close = false): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cp = (points[i - 1].x + points[i].x) / 2;
    d += ` C ${cp} ${points[i - 1].y} ${cp} ${points[i].y} ${points[i].x} ${points[i].y}`;
  }
  if (close) {
    const last = points[points.length - 1];
    const first = points[0];
    d += ` L ${last.x} ${first.y + 100} L ${first.x} ${first.y + 100} Z`;
  }
  return d;
}

export function SparkLine({
  data,
  width = 80,
  height = 32,
  color = "#4a90d9",
  filled = true,
  strokeWidth = 1.5,
}: SparkLineProps) {
  const points = useMemo(() => {
    if (!data || data.length < 2) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = strokeWidth;
    const w = width - pad * 2;
    const h = height - pad * 2;
    return data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * w,
      y: pad + h - ((v - min) / range) * h,
    }));
  }, [data, width, height, strokeWidth]);

  if (points.length < 2) {
    return <View style={{ width, height }} />;
  }

  const gradId = `sg-${color.replace("#", "")}`;

  return (
    <Svg width={width} height={height}>
      {filled && (
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
      )}
      {filled && (
        <Path
          d={buildPath(points, true)}
          fill={`url(#${gradId})`}
          stroke="none"
        />
      )}
      <Path
        d={buildPath(points, false)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
