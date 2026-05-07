import AsyncStorage from "@react-native-async-storage/async-storage";

import { ZABBIX_STORAGE } from "./zabbix/ZabbixClient";

const ENV_URL = (process.env.EXPO_PUBLIC_ZABBIX_URL ?? "").trim();
const ENV_TOKEN = (process.env.EXPO_PUBLIC_ZABBIX_TOKEN ?? "").trim();

export const autoConfigPromise: Promise<void> = (async () => {
  try {
    const ops: Promise<void>[] = [];
    if (ENV_URL) {
      ops.push(AsyncStorage.setItem(ZABBIX_STORAGE.serverUrl, ENV_URL));
    }
    if (ENV_TOKEN) {
      ops.push(AsyncStorage.setItem(ZABBIX_STORAGE.apiToken, ENV_TOKEN));
    }
    if (ops.length > 0) {
      await Promise.all(ops);
    }
  } catch {
    // never block app startup
  }
})();
