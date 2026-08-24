import { Temporal } from "@js-temporal/polyfill";

import { AppController } from "../src/app/appController";
import { publicSchedule } from "../src/data/publicSchedule";
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

  it("opens directly to the built-in public schedule without a setup code", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(
      root,
      () =>
        Temporal.ZonedDateTime.from(
          "2026-08-23T12:00:00-04:00[America/New_York]",
        ),
      publicSchedule,
    );
    controller.start();

    expect(root.textContent).toContain("MA251B");
    expect(root.textContent).toContain("Nicarry Hall");
    expect(root.textContent).toContain("Room 202");
    expect(root.querySelector("#setup-code")).toBeNull();
    expect(root.textContent).not.toContain("setup code");
    expect(localStorage.length).toBe(0);
    controller.destroy();
  });

  it("removes obsolete setup fragments without displaying their contents", () => {
    history.replaceState(null, "", "/#setup=obsolete-private-value");
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(root, () =>
      Temporal.ZonedDateTime.from(
        "2026-08-23T12:00:00-04:00[America/New_York]",
      ),
    );
    controller.start();
    expect(window.location.hash).toBe("");
    expect(root.textContent).not.toContain("obsolete-private-value");
    controller.destroy();
  });

  it("does not request geolocation until Campus guide is tapped", async () => {
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
    const controller = new AppController(
      root,
      () =>
        Temporal.ZonedDateTime.from(
          "2029-12-01T12:00:00-05:00[America/New_York]",
        ),
      syntheticConfiguration(),
    );
    controller.start();
    expect(geolocationCalls).toBe(0);

    buttonNamed(
      root,
      "Campus guide to Example Science Center, Room A12",
    ).click();
    await vi.waitFor(() =>
      expect(root.querySelector("svg.campus-map")).not.toBeNull(),
    );
    expect(geolocationCalls).toBe(1);
    expect(root.querySelectorAll("a[href]")).toHaveLength(0);
    expect(root.textContent).toContain("Room A12");
    controller.destroy();
  });

  it("suppresses outdoor guidance for a same-building transition", () => {
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
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(
      root,
      () =>
        Temporal.ZonedDateTime.from(
          "2030-01-07T10:30:00-05:00[America/New_York]",
        ),
      configuration,
    );
    controller.start();
    expect(root.textContent).toContain(
      "Your last scheduled class and your next class are both in Example Science Center",
    );
    expect(
      [...root.querySelectorAll("button")].some((button) =>
        button.textContent?.startsWith(
          "Campus guide to Example Science Center",
        ),
      ),
    ).toBe(false);
    expect(
      buttonNamed(root, "I’m somewhere else, use my location"),
    ).toBeInstanceOf(HTMLButtonElement);
    controller.destroy();
  });
});
