import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

type SmsCodePlugin = {
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(event: "code", listener: (data: { code: string }) => void): Promise<PluginListenerHandle>;
};

const SmsCode = registerPlugin<SmsCodePlugin>("SmsCode");
let handle: PluginListenerHandle | null = null;

const available = () => Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("SmsCode");

/**
 * Android app: call right before asking the server for a code. When the SMS lands, Android asks once
 * "allow reading this message?" and onCode gets the 6 digits. Elsewhere it does nothing (the input's
 * autocomplete="one-time-code" covers iPhone and keyboard suggestions).
 */
export async function listenForSmsCode(onCode: (code: string) => void): Promise<void> {
  if (!available()) return;
  await stopSmsCode();
  try {
    handle = await SmsCode.addListener("code", ({ code }) => { if (/^\d{6}$/.test(code)) onCode(code); });
    await SmsCode.start();
  } catch {
    // Older app build or no Google Play services: typing the code still works.
  }
}

export async function stopSmsCode(): Promise<void> {
  try { await handle?.remove(); } catch { /* already gone */ }
  handle = null;
  if (!available()) return;
  try { await SmsCode.stop(); } catch { /* nothing listening */ }
}
