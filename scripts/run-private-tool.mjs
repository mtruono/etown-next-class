import { tsImport } from "tsx/esm/api";

const action = process.argv[2];

if (action === "generate") {
  await tsImport("./make-private-assets.ts", import.meta.url);
} else if (action === "verify") {
  const { loadPrivateInputs } = await tsImport(
    "./private-inputs.ts",
    import.meta.url,
  );
  const { verifyPrivateIcs, verifyPrivateSchedule } = await tsImport(
    "./verify-private-schedule.ts",
    import.meta.url,
  );
  const { configuration, expectations } = await loadPrivateInputs();
  const meetings = verifyPrivateSchedule(configuration, expectations);
  verifyPrivateIcs(configuration, meetings);
  process.stdout.write(
    `Private schedule verified: ${meetings.length} occurrences.\n`,
  );
} else {
  throw new Error("Expected private tool action: generate or verify");
}
