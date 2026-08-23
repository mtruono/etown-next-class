import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AppConfiguration } from "../src/domain/types";
import { validateConfiguration } from "../src/import/configurationSchema";

export const PRIVATE_SEED_PATH = resolve("private/schedule.seed.json");
export const PRIVATE_EXPECTATIONS_PATH = resolve(
  "private/schedule.expectations.private.json",
);
export const PRIVATE_OUTPUT_DIRECTORY = resolve("private/generated");

export interface DateExpectation {
  date: string;
  meetingCount: number;
  courseCodes?: string[];
  modalities?: string[];
  noClassesReason?: string;
}

export interface StateExpectation {
  now: string;
  currentCourse?: string | null;
  currentRoom?: string;
  nextCourse?: string | null;
  nextDate?: string;
  nextTime?: string;
  nextRoom?: string;
  sameBuilding?: boolean;
  phase?: string;
}

export interface PrivateExpectations {
  total: number;
  countsByCourse: Record<string, number>;
  countsByModality: Record<string, number>;
  firstOccurrence: Record<string, string>;
  lastOccurrence: Record<string, string>;
  dateCases: DateExpectation[];
  stateCases: StateExpectation[];
  dstCases: Array<{
    meetingDate: string;
    courseCode: string;
    localStart: string;
    utcHour: number;
  }>;
  virtualOccurrence: {
    date: string;
    courseCode: string;
    startTime: string;
    endTime: string;
    replacementLabel: string;
  };
  routePairs: Array<[string, string]>;
}

export async function loadPrivateInputs(): Promise<{
  configuration: AppConfiguration;
  expectations: PrivateExpectations;
  seedBytes: Uint8Array;
}> {
  const [seedBytes, expectationsText] = await Promise.all([
    readFile(PRIVATE_SEED_PATH),
    readFile(PRIVATE_EXPECTATIONS_PATH, "utf8"),
  ]);
  const configuration = validateConfiguration(
    JSON.parse(seedBytes.toString("utf8")) as unknown,
  );
  const expectations = JSON.parse(expectationsText) as PrivateExpectations;
  return { configuration, expectations, seedBytes };
}
