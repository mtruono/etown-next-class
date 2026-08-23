import { decodeSetupCode, encodeSetupCode } from "../src/import/setupCode";
import { takeSetupCodeFromFragment } from "../src/import/setupImport";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

async function envelope(payload: string, prefix = "ETOWN1"): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  const checksum = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  return `${prefix}.${payload}.${checksum}`;
}

describe("setup codes", () => {
  it("exports and reimports a valid configuration", async () => {
    const configuration = syntheticConfiguration();
    const code = await encodeSetupCode(configuration);
    expect(code).toMatch(/^ETOWN1\.[A-Za-z0-9_-]+\.[0-9a-f]{16}$/u);
    await expect(decodeSetupCode(code)).resolves.toEqual(configuration);
  });

  it("rejects bad prefixes, checksum changes, malformed base64url, JSON, and oversize", async () => {
    const code = await encodeSetupCode(syntheticConfiguration());
    await expect(
      decodeSetupCode(code.replace("ETOWN1", "OTHER1")),
    ).rejects.toMatchObject({ code: "bad-prefix" });
    const changedChecksum = `${code.slice(0, -1)}${code.endsWith("0") ? "1" : "0"}`;
    await expect(decodeSetupCode(changedChecksum)).rejects.toMatchObject({
      code: "bad-checksum",
    });
    await expect(
      decodeSetupCode(await envelope("not=base64")),
    ).rejects.toMatchObject({ code: "invalid-base64url" });
    await expect(
      decodeSetupCode(await envelope(base64Url("not json"))),
    ).rejects.toMatchObject({ code: "invalid-json" });
    await expect(
      decodeSetupCode(`ETOWN1.${"a".repeat(52_000)}.0000000000000000`),
    ).rejects.toMatchObject({ code: "oversized" });
  });

  it("rejects unknown versions and invalid nested data", async () => {
    const unknown = { ...syntheticConfiguration(), schemaVersion: 2 };
    await expect(
      decodeSetupCode(await envelope(base64Url(JSON.stringify(unknown)))),
    ).rejects.toMatchObject({ code: "unknown-version" });
    const invalidCoordinate = structuredClone(syntheticConfiguration());
    invalidCoordinate.destinations[0]!.latitude = 91;
    await expect(
      decodeSetupCode(
        await envelope(base64Url(JSON.stringify(invalidCoordinate))),
      ),
    ).rejects.toMatchObject({ code: "invalid-configuration" });
    const duplicate = structuredClone(syntheticConfiguration());
    duplicate.meetingPatterns.push({ ...duplicate.meetingPatterns[0]! });
    await expect(
      decodeSetupCode(await envelope(base64Url(JSON.stringify(duplicate)))),
    ).rejects.toMatchObject({ code: "invalid-configuration" });
    const missingId = structuredClone(syntheticConfiguration()) as unknown as {
      meetingPatterns: Array<Record<string, unknown>>;
    };
    delete missingId.meetingPatterns[0]!.id;
    await expect(
      decodeSetupCode(await envelope(base64Url(JSON.stringify(missingId)))),
    ).rejects.toMatchObject({ code: "invalid-configuration" });
    const unknownDestination = structuredClone(syntheticConfiguration());
    unknownDestination.meetingPatterns[0]!.destinationId = "missing-building";
    await expect(
      decodeSetupCode(
        await envelope(base64Url(JSON.stringify(unknownDestination))),
      ),
    ).rejects.toMatchObject({ code: "invalid-configuration" });
    const badEnd = structuredClone(syntheticConfiguration());
    badEnd.meetingPatterns[0]!.endTime = "08:00";
    await expect(
      decodeSetupCode(await envelope(base64Url(JSON.stringify(badEnd)))),
    ).rejects.toMatchObject({ code: "invalid-configuration" });
  });

  it("extracts and immediately clears an optional setup fragment", () => {
    const replaceState = vi.fn();
    const result = takeSetupCodeFromFragment(
      { hash: "#setup=ETOWN1.abc.123", pathname: "/sample/", search: "?x=1" },
      { replaceState },
    );
    expect(result).toEqual({ code: "ETOWN1.abc.123", hadFragment: true });
    expect(replaceState).toHaveBeenCalledWith(null, "", "/sample/?x=1");
  });
});
