import type { AppConfiguration } from "../domain/types";
import { validateConfiguration } from "./configurationSchema";

export const SETUP_CODE_PREFIX = "ETOWN1";
export const MAX_SETUP_CODE_BYTES = 50 * 1024;

export type SetupCodeErrorCode =
  | "oversized"
  | "malformed"
  | "bad-prefix"
  | "bad-checksum"
  | "invalid-base64url"
  | "invalid-utf8"
  | "invalid-json"
  | "unknown-version"
  | "invalid-configuration";

export class SetupCodeError extends Error {
  constructor(
    public readonly code: SetupCodeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SetupCodeError";
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(payload: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(payload)) {
    throw new SetupCodeError(
      "invalid-base64url",
      "The setup payload is not valid base64url.",
    );
  }
  const padding = "=".repeat((4 - (payload.length % 4)) % 4);
  try {
    const binary = atob(
      payload.replaceAll("-", "+").replaceAll("_", "/") + padding,
    );
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    if (bytesToBase64Url(bytes) !== payload) {
      throw new SetupCodeError(
        "invalid-base64url",
        "The setup payload is not canonical base64url.",
      );
    }
    return bytes;
  } catch (error) {
    if (error instanceof SetupCodeError) throw error;
    throw new SetupCodeError(
      "invalid-base64url",
      "The setup payload is not valid base64url.",
    );
  }
}

async function checksumFor(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export async function encodeSetupCode(
  configuration: AppConfiguration,
): Promise<string> {
  const validated = validateConfiguration(configuration);
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(validated)),
  );
  const checksum = await checksumFor(payload);
  const code = `${SETUP_CODE_PREFIX}.${payload}.${checksum}`;
  if (byteLength(code) > MAX_SETUP_CODE_BYTES) {
    throw new SetupCodeError(
      "oversized",
      "The setup code exceeds the 50 KB limit.",
    );
  }
  return code;
}

export async function decodeSetupCode(
  codeInput: string,
): Promise<AppConfiguration> {
  if (byteLength(codeInput) > MAX_SETUP_CODE_BYTES) {
    throw new SetupCodeError(
      "oversized",
      "The setup code exceeds the 50 KB limit.",
    );
  }
  const code = codeInput.trim();

  const parts = code.split(".");
  if (parts.length !== 3 || !parts[1] || !parts[2]) {
    throw new SetupCodeError(
      "malformed",
      "The setup code must have three dot-separated parts.",
    );
  }
  const [prefix, payload, suppliedChecksum] = parts;
  if (prefix !== SETUP_CODE_PREFIX) {
    throw new SetupCodeError(
      "bad-prefix",
      "This setup code version is not supported.",
    );
  }
  if (!/^[0-9a-f]{16}$/u.test(suppliedChecksum)) {
    throw new SetupCodeError("malformed", "The setup checksum is malformed.");
  }
  const expectedChecksum = await checksumFor(payload);
  if (expectedChecksum !== suppliedChecksum) {
    throw new SetupCodeError(
      "bad-checksum",
      "The setup code checksum does not match. Copy the full code and try again.",
    );
  }

  const bytes = base64UrlToBytes(payload);
  let json: string;
  try {
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SetupCodeError(
      "invalid-utf8",
      "The setup payload is not valid UTF-8 text.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new SetupCodeError(
      "invalid-json",
      "The setup payload does not contain valid JSON.",
    );
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "schemaVersion" in parsed &&
    (parsed as { schemaVersion?: unknown }).schemaVersion !== 1
  ) {
    throw new SetupCodeError(
      "unknown-version",
      "This schedule schema version is not supported.",
    );
  }

  try {
    return validateConfiguration(parsed);
  } catch {
    throw new SetupCodeError(
      "invalid-configuration",
      "The setup payload failed schedule and destination validation.",
    );
  }
}
