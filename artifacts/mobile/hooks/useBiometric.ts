import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const BIOMETRIC_KEY = "biometric_enabled";

export function useBiometric() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (Platform.OS !== "web") {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setAvailable(hasHardware && isEnrolled);
      }
      const stored = await AsyncStorage.getItem(BIOMETRIC_KEY);
      setEnabled(stored === "true");
      setLoading(false);
    };
    init();
  }, []);

  const toggle = async (value: boolean) => {
    if (value && Platform.OS !== "web") {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to enable biometric unlock",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        await AsyncStorage.setItem(BIOMETRIC_KEY, "true");
        setEnabled(true);
      } else {
        setEnabled(false);
      }
    } else {
      await AsyncStorage.setItem(BIOMETRIC_KEY, value ? "true" : "false");
      setEnabled(value);
    }
  };

  return { enabled, available, loading, toggle };
}
