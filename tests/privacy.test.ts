import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
}

describe("source privacy invariants", () => {
  it("does not use HTML parsing or coordinate logging in application source", async () => {
    const files = (await filesUnder("src")).filter((file) =>
      [".ts", ".css"].includes(extname(file)),
    );
    const source = (
      await Promise.all(files.map((file) => readFile(file, "utf8")))
    ).join("\n");
    expect(source).not.toContain("innerHTML");
    expect(source).not.toMatch(/console\.(?:log|debug|info)/u);
    expect(source).not.toContain("watchPosition(");
  });

  it("keeps required private patterns in gitignore", async () => {
    const ignore = await readFile(".gitignore", "utf8");
    for (const pattern of [
      "private/",
      "*.ics",
      "*.setup.txt",
      "*.setup-url.txt",
      "*.private.json",
      ".env",
      "playwright-report/",
      "test-results/",
    ]) {
      expect(ignore).toContain(pattern);
    }
  });
});
