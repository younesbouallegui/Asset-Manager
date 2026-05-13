import AsyncStorage from "@react-native-async-storage/async-storage";

import { ZABBIX_STORAGE } from "./zabbix/ZabbixClient";

const ENV_URL = (process.env.EXPO_PUBLIC_ZABBIX_URL ?? "").trim();
const ENV_TOKEN = (process.env.EXPO_PUBLIC_ZABBIX_TOKEN ?? "").trim();
const ENV_API = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();
const ENV_DOMAIN = (process.env.EXPO_PUBLIC_DOMAIN ?? "").trim();

console.log(
  "[autoConfig] env check —",
  JSON.stringify({
    EXPO_PUBLIC_ZABBIX_URL: ENV_URL ? `${ENV_URL.slice(0, 30)}…` : "(not set)",
    EXPO_PUBLIC_ZABBIX_TOKEN: ENV_TOKEN ? `${ENV_TOKEN.slice(0, 8)}…` : "(not set)",
    EXPO_PUBLIC_API_URL: ENV_API || "(not set)",
    EXPO_PUBLIC_DOMAIN: ENV_DOMAIN || "(not set)",
  }),
);

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
      console.log("[autoConfig] Zabbix config applied from build-time env vars.");
    } else {
      console.log("[autoConfig] No build-time env vars set — user must configure manually in Settings.");
    }
  } catch (e) {
    console.error("[autoConfig] Failed to persist env config:", (e as Error).message);
  }
})();
