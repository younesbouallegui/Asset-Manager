import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

interface GaugeRingProps {
  value: number;    // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
  colorOk?: string;
  colorWarn?: string;
  colorDanger?: string;
  warnThreshold?: number;
  dangerThreshold?: number;
  trackColor?: string;
  labelColor?: string;
  valueColor?: string;
}

export function GaugeRing({
  value,
  size = 80,
  strokeWidth = 7,
  label,
  unit = "%",
  colorOk = "#43a047",
  colorWarn = "#ff9800",
  colorDanger = "#e53935",
  warnThreshold = 70,
  dangerThreshold = 85,
  trackColor = "rgba(255,255,255,0.08)",
  labelColor = "#9d9d9d",
  valueColor = "#ffffff",
}: GaugeRingProps) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const filled = (pct / 100) * circumference;
  const gap = circumference - filled;

  const color =
    pct >= dangerThreshold ? colorDanger : pct >= warnThreshold ? colorWarn : colorOk;

  const displayValue = Number.isFinite(value) ? Math.round(pct) : "—";

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <G rotation="-90" origin={`${cx}, ${cy}`}>
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              stroke={trackColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${filled} ${gap}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: valueColor,
              fontFamily: "Inter_700Bold",
              fontSize: size * 0.22,
              lineHeight: size * 0.27,
            }}
          >
            {displayValue}{unit && pct > 0 ? unit : ""}
          </Text>
        </View>
      </View>
      {label ? (
        <Text
          style={{
            color: labelColor,
            fontFamily: "Inter_500Medium",
            fontSize: 11,
            marginTop: 4,
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
