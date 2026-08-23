import { readFile } from "node:fs/promises";

import sharp from "sharp";

describe("PWA assets", () => {
  it("contains the required relative manifest configuration", async () => {
    const manifest = JSON.parse(
      await readFile("public/manifest.webmanifest", "utf8"),
    ) as {
      name: string;
      short_name: string;
      display: string;
      orientation: string;
      start_url: string;
      scope: string;
      lang: string;
      icons: Array<{ src: string; sizes: string; purpose?: string }>;
    };
    expect(manifest).toMatchObject({
      name: "Etown Next Class",
      short_name: "Next Class",
      display: "standalone",
      orientation: "portrait",
      start_url: "./",
      scope: "./",
      lang: "en-US",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192" }),
        expect.objectContaining({ sizes: "512x512" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  it.each([
    ["public/icons/icon-180.png", 180],
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
    ["public/icons/icon-maskable-512.png", 512],
  ])("has the expected dimensions for %s", async (path, size) => {
    const metadata = await sharp(path).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(size);
    expect(metadata.height).toBe(size);
  });

  it("uses local scripts, a tested meta CSP, and iPhone web-app metadata", async () => {
    const html = await readFile("index.html", "utf8");
    expect(html).toContain("viewport-fit=cover");
    expect(html).toContain('name="apple-mobile-web-app-capable"');
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("script-src 'self'");
    expect(html).toContain('src="/src/main.ts"');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/u);
    expect(html).not.toMatch(/https?:\/\/[^"']+\.(?:js|css)/u);
  });
});
