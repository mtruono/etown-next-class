import { Temporal } from "@js-temporal/polyfill";

import { AppController } from "../src/app/appController";
import { encodeSetupCode } from "../src/import/setupCode";
import { createConfigurationStore } from "../src/storage/configurationStore";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

function buttonNamed(root: HTMLElement, label: string): HTMLButtonElement {
  const button = [...root.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

describe("application controller", () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState(null, "", "/");
    document.body.replaceChildren();
  });

  it("previews before saving and restores parsed configuration", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(root);
    await controller.start();
    expect(localStorage.length).toBe(0);

    const textarea = root.querySelector<HTMLTextAreaElement>("#setup-code")!;
    textarea.value = await encodeSetupCode(syntheticConfiguration());
    buttonNamed(root, "Review setup code").click();
    await vi.waitFor(() =>
      expect(root.textContent).toContain("Confirm schedule import"),
    );
    expect(localStorage.length).toBe(0);

    buttonNamed(root, "Save schedule on this device").click();
    expect(localStorage.length).toBe(1);
    expect(root.textContent).toContain("Example Science Center");
    expect(root.textContent).toContain("Room A12");
    controller.destroy();
  });

  it("does not request geolocation until Directions is tapped", async () => {
    createConfigurationStore(localStorage).save(syntheticConfiguration());
    let geolocationCalls = 0;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          geolocationCalls += 1;
          success({
            coords: {
              latitude: 39.95,
              longitude: -75.16,
              accuracy: 20,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: 1,
            toJSON: () => ({}),
          });
        },
      },
    });
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(root, localStorage, () =>
      Temporal.ZonedDateTime.from(
        "2029-12-01T12:00:00-05:00[America/New_York]",
      ),
    );
    await controller.start();
    expect(geolocationCalls).toBe(0);

    buttonNamed(root, "Directions to Example Science Center, Room A12").click();
    await vi.waitFor(() =>
      expect(root.querySelector('a[href*="type:walking"]')).not.toBeNull(),
    );
    expect(geolocationCalls).toBe(1);
    expect(window.location.pathname).toBe("/");
    expect(root.textContent).toContain("Room A12");
    controller.destroy();
  });

  it("suppresses outdoor routing for a same-building transition", async () => {
    const configuration = syntheticConfiguration();
    configuration.meetingPatterns.push({
      id: "chem220x-m",
      courseCode: "CHEM220X",
      title: "Invented Chemistry",
      isoWeekdays: [1],
      startTime: "11:00",
      endTime: "12:00",
      destinationId: "sample-science",
      room: "C21",
      defaultModality: "in-person",
    });
    createConfigurationStore(localStorage).save(configuration);
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(root, localStorage, () =>
      Temporal.ZonedDateTime.from(
        "2030-01-07T10:30:00-05:00[America/New_York]",
      ),
    );
    await controller.start();
    expect(root.textContent).toContain(
      "Your last scheduled class and your next class are both in Example Science Center",
    );
    expect(
      [...root.querySelectorAll("button")].some((button) =>
        button.textContent?.startsWith("Directions to Example Science Center"),
      ),
    ).toBe(false);
    expect(
      buttonNamed(root, "I’m somewhere else, use my location"),
    ).toBeInstanceOf(HTMLButtonElement);
    controller.destroy();
  });
});
