import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { expandSchedule } from "../src/domain/scheduleEngine";
import { makeSetupCode, makeSetupUrl } from "./make-setup-code";
import { buildIcs } from "./make-ics";
import { buildRouteVerificationPage } from "./make-route-test-page";
import { loadPrivateInputs, PRIVATE_OUTPUT_DIRECTORY } from "./private-inputs";
import {
  verifyPrivateIcs,
  verifyPrivateSchedule,
} from "./verify-private-schedule";

const GENERATOR_VERSION = "1.0.0";

async function main(): Promise<void> {
  const { configuration, expectations, seedBytes } = await loadPrivateInputs();
  const verifiedMeetings = verifyPrivateSchedule(configuration, expectations);
  verifyPrivateIcs(configuration, verifiedMeetings);
  const expandedMeetings = expandSchedule(configuration);
  if (verifiedMeetings.length !== expandedMeetings.length)
    throw new Error("Verification mismatch");

  const generatedAt = new Date().toISOString();
  const setupCode = await makeSetupCode(configuration);
  const ics = buildIcs(configuration, expandedMeetings, generatedAt);
  const routePage = buildRouteVerificationPage(
    configuration,
    expectations.routePairs,
  );
  const countsByCourse = Object.fromEntries(
    [...new Set(expandedMeetings.map((meeting) => meeting.courseCode))]
      .sort()
      .map((courseCode) => [
        courseCode,
        expandedMeetings.filter((meeting) => meeting.courseCode === courseCode)
          .length,
      ]),
  );
  const countsByModality = Object.fromEntries(
    ["in-person", "virtual"].map((modality) => [
      modality,
      expandedMeetings.filter((meeting) => meeting.modality === modality)
        .length,
    ]),
  );
  const audit = {
    generatorVersion: GENERATOR_VERSION,
    generationTimestamp: generatedAt,
    sourceSeedSha256: createHash("sha256").update(seedBytes).digest("hex"),
    totalEventCount: expandedMeetings.length,
    countsByCourse,
    countsByModality,
    firstOccurrence: expandedMeetings[0]?.id ?? null,
    lastOccurrence: expandedMeetings.at(-1)?.id ?? null,
    noClassDates: configuration.dateRules
      .filter((rule) => rule.kind === "no-classes")
      .map((rule) => rule.date),
    replacementScheduleDates: configuration.dateRules
      .filter((rule) => rule.kind === "replacement-weekday")
      .map((rule) => rule.date),
    virtualOccurrence:
      expandedMeetings.find((meeting) => meeting.modality === "virtual")?.id ??
      null,
  };

  await mkdir(PRIVATE_OUTPUT_DIRECTORY, { recursive: true });
  const outputs: Array<[string, string]> = [
    ["student-setup.txt", `${setupCode}\n`],
    ["student-classes.ics", ics],
    ["schedule-audit.json", `${JSON.stringify(audit, null, 2)}\n`],
    ["route-verification.html", routePage],
  ];
  if (process.env.APP_URL) {
    outputs.push([
      "student-setup-url.txt",
      `${makeSetupUrl(process.env.APP_URL, setupCode)}\n`,
    ]);
  }
  await Promise.all(
    outputs.map(([filename, contents]) =>
      writeFile(join(PRIVATE_OUTPUT_DIRECTORY, filename), contents),
    ),
  );

  process.stdout.write(
    `Generated ${expandedMeetings.length} private calendar events.\n`,
  );
  for (const [filename] of outputs) {
    process.stdout.write(
      `${relative(process.cwd(), join(PRIVATE_OUTPUT_DIRECTORY, filename))}\n`,
    );
  }
}

await main();
