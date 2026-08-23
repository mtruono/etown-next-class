import type { AppConfiguration } from "../src/domain/types";
import { encodeSetupCode } from "../src/import/setupCode";

export async function makeSetupCode(
  configuration: AppConfiguration,
): Promise<string> {
  return encodeSetupCode(configuration);
}

export function makeSetupUrl(appUrl: string, setupCode: string): string {
  const url = new URL(appUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("APP_URL must use HTTPS (except localhost). ");
  }
  url.hash = `setup=${encodeURIComponent(setupCode)}`;
  return url.toString();
}
