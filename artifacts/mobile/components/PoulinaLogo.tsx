import React from "react";
import { Image } from "react-native";

const SOURCE = require("../assets/images/poulina-logo.png");

export function PoulinaLogo({ size = 100 }: { size?: number }) {
  return (
    <Image
      source={SOURCE}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Poulina Group"
    />
  );
}
