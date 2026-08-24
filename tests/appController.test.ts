import { Temporal } from "@js-temporal/polyfill";

import { AppController } from "../src/app/appController";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

function buttonNamed(root: HTMLElement, label: RegExp): HTMLButtonElement {
  const button = [...root.querySelectorAll("button")].find((candidate) =>
    label.test(candidate.textContent?.trim() ?? ""),
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

function installGeolocation(
  latitude = 39.95,
  longitude = -75.16,
): () => number {
  let calls = 0;
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition(success: PositionCallback) {
        calls += 1;
        success({
          coords: {
            latitude,
            longitude,
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
  return () => calls;
}

describe("application controller", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.replaceChildren();
  });

  it("opens as a personal assistant with class and home actions", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(
      root,
      () =>
        Temporal.ZonedDateTime.from(
          "2030-01-07T08:00:00-05:00[America/New_York]",
        ),
      syntheticConfiguration(),
    );
    controller.start();
    expect(root.textContent).toContain("Etown Campus Assistant");
    expect(root.textContent).toContain("Fictional Field Biology");
    expect(buttonNamed(root, /TAKE ME TO CLASS/u)).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(buttonNamed(root, /TAKE ME HOME/u)).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(
      root.querySelector("details.schedule-disclosure")?.hasAttribute("open"),
    ).toBe(false);
    controller.destroy();
  });

  it("requests geolocation only after navigation and launches Concept3D on campus", async () => {
    const getCalls = installGeolocation();
    const launched: string[] = [];
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(
      root,
      () =>
        Temporal.ZonedDateTime.from(
          "2030-01-07T08:00:00-05:00[America/New_York]",
        ),
      syntheticConfiguration(),
      (url) => launched.push(url),
    );
    controller.start();
    expect(getCalls()).toBe(0);
    buttonNamed(root, /TAKE ME TO CLASS/u).click();
    await vi.waitFor(() => expect(launched).toHaveLength(1));
    expect(getCalls()).toBe(1);
    expect(launched[0]).toContain("map.concept3d.com");
    expect(launched[0]).toContain("type:walking");
    controller.destroy();
  });

  it("uses the same navigation service for the home destination", async () => {
    installGeolocation();
    const launched: string[] = [];
    const root = document.createElement("div");
    document.body.append(root);
    const controller = new AppController(
      root,
      () =>
        Temporal.ZonedDateTime.from(
          "2030-01-07T08:00:00-05:00[America/New_York]",
        ),
      syntheticConfiguration(),
      (url) => launched.push(url),
    );
    controller.start();
    buttonNamed(root, /TAKE ME HOME/u).click();
    await vi.waitFor(() => expect(launched).toHaveLength(1));
    expect(decodeURIComponent(launched[0]!)).toContain("Example Residence");
    controller.destroy();
  });

  it("shows the same-building shortcut with an elsewhere action", () => {
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
      "Stay in Example Science Center and go to Room C21",
    );
    expect(buttonNamed(root, /I’m somewhere else/u)).toBeInstanceOf(
      HTMLButtonElement,
    );
    controller.destroy();
  });
});
