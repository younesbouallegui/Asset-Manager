import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const NOTIF_KEY = "push_notifications_enabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((val) => {
      setEnabled(val === "true");
      setLoading(false);
    });
  }, []);

  const toggle = async (value: boolean) => {
    if (value) {
      if (Platform.OS === "web") {
        await AsyncStorage.setItem(NOTIF_KEY, "true");
        setEnabled(true);
        return;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        await AsyncStorage.setItem(NOTIF_KEY, "true");
        setEnabled(true);
      } else {
        await AsyncStorage.setItem(NOTIF_KEY, "false");
        setEnabled(false);
      }
    } else {
      await AsyncStorage.setItem(NOTIF_KEY, "false");
      setEnabled(false);
    }
  };

  return { enabled, loading, toggle };
}
