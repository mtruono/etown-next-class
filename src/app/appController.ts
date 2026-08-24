import { Temporal } from "@js-temporal/polyfill";

import type { AppState, DirectionSession } from "./appState";
import { publicSchedule } from "../data/publicSchedule";
import { getScheduleState } from "../domain/scheduleState";
import type {
  AppConfiguration,
  Destination,
  ExpandedMeeting,
} from "../domain/types";
import { requestCurrentPosition } from "../location/geolocation";
import {
  assessCapturedLocation,
  eligibleLastBuilding,
} from "../location/locationDecision";
import type { CampusMapOrigin } from "../map/campusMap";
import { renderAbout } from "../ui/aboutView";
import { renderDirections } from "../ui/directionsView";
import { actionButton, element } from "../ui/elements";
import { renderSchedule } from "../ui/scheduleView";
import { renderSettings } from "../ui/settingsView";

type NowProvider = () => Temporal.Instant | Temporal.ZonedDateTime;

export class AppController {
  private readonly now: NowProvider;
  private state: AppState;
  private clockTimer: number | null = null;
  private applyUpdate: (() => Promise<void>) | null = null;

  constructor(
    private readonly root: HTMLElement,
    now: NowProvider = () => Temporal.Now.instant(),
    configuration: AppConfiguration = publicSchedule,
  ) {
    this.now = now;
    this.state = {
      view: "home",
      configuration,
      directions: null,
      online: navigator.onLine,
      updateAvailable: false,
    };
  }

  start(): void {
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    window.addEventListener("online", () => {
      this.state.online = true;
      this.render();
    });
    window.addEventListener("offline", () => {
      this.state.online = false;
      this.render();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.render();
    });
    this.clockTimer = window.setInterval(() => {
      if (this.state.view === "home") this.render();
    }, 30_000);
    this.render();
  }

  destroy(): void {
    if (this.clockTimer !== null) window.clearInterval(this.clockTimer);
  }

  setUpdateAvailable(applyUpdate: () => Promise<void>): void {
    this.applyUpdate = applyUpdate;
    this.state.updateAvailable = true;
    this.render();
  }

  private destinationForMeeting(meeting: ExpandedMeeting): Destination {
    const destination = this.state.configuration.destinations.find(
      ({ id }) => id === meeting.destinationId,
    );
    if (!destination)
      throw new Error("The meeting destination is unavailable.");
    return destination;
  }

  private homeFallback(): Destination {
    const configuration = this.state.configuration;
    const home = configuration.destinations.find(
      ({ id }) => id === configuration.homeFallbackDestinationId,
    );
    if (!home) throw new Error("The home fallback destination is unavailable.");
    return home;
  }

  private makeDirectionSession(meeting: ExpandedMeeting): DirectionSession {
    return {
      meeting,
      requesting: true,
      failureMessage: null,
      capturedPosition: null,
      assessment: null,
      acceptedLowAccuracy: false,
      fixedOrigin: null,
      destinationOnly: false,
      originDisclosure: null,
    };
  }

  private async beginDirections(meeting: ExpandedMeeting): Promise<void> {
    if (meeting.modality === "virtual") return;
    const session = this.makeDirectionSession(meeting);
    this.state.directions = session;
    this.state.view = "directions";
    this.render();
    const result = await requestCurrentPosition();
    if (this.state.directions !== session) return;
    session.requesting = false;
    if (!result.ok) {
      session.failureMessage = result.message;
    } else {
      session.capturedPosition = result.position;
      session.assessment = assessCapturedLocation(
        this.state.configuration,
        result.position,
        this.destinationForMeeting(meeting),
      );
    }
    this.render();
  }

  private previewFromHome(meeting: ExpandedMeeting): void {
    if (meeting.modality === "virtual") return;
    const home = this.homeFallback();
    this.state.directions = {
      ...this.makeDirectionSession(meeting),
      requesting: false,
      fixedOrigin: {
        latitude: home.latitude,
        longitude: home.longitude,
        name: "Founders B, approximate",
      },
      originDisclosure:
        "Founders B is an approximate B/C building-center fallback, not your live location or a verified doorway.",
    };
    this.state.view = "directions";
    this.render();
  }

  private setFallbackOrigin(
    destination: Destination,
    disclosure: string,
  ): void {
    if (!this.state.directions) return;
    const isHome =
      destination.id === this.state.configuration.homeFallbackDestinationId;
    const origin: CampusMapOrigin = {
      latitude: destination.latitude,
      longitude: destination.longitude,
      name: isHome ? "Founders B, approximate" : destination.displayName,
    };
    Object.assign(this.state.directions, {
      requesting: false,
      failureMessage: null,
      capturedPosition: null,
      assessment: null,
      acceptedLowAccuracy: false,
      fixedOrigin: origin,
      destinationOnly: false,
      originDisclosure: disclosure,
    });
    this.render();
  }

  private renderUpdateBanner(): void {
    if (!this.state.updateAvailable || !this.applyUpdate) return;
    this.root.prepend(
      element(
        "aside",
        { className: "update-banner", attributes: { role: "status" } },
        element("span", { text: "An app update is ready." }),
        actionButton(
          "Refresh app",
          async () => {
            await this.applyUpdate?.();
          },
          { className: "button button-update" },
        ),
      ),
    );
  }

  render(): void {
    const configuration = this.state.configuration;
    switch (this.state.view) {
      case "home": {
        const scheduleState = getScheduleState(configuration, this.now());
        renderSchedule(
          this.root,
          configuration,
          scheduleState,
          this.state.online,
          {
            openSettings: () => {
              this.state.view = "settings";
              this.render();
            },
            directions: (meeting) => this.beginDirections(meeting),
            directionsFromElsewhere: (meeting) => this.beginDirections(meeting),
            previewFromHome: (meeting) => this.previewFromHome(meeting),
          },
        );
        break;
      }
      case "directions": {
        if (!this.state.directions) {
          this.state.view = "home";
          this.render();
          return;
        }
        const scheduleState = getScheduleState(configuration, this.now());
        const lastBuilding = eligibleLastBuilding(
          scheduleState.previous,
          scheduleState.campusNow,
          configuration.destinations,
        );
        renderDirections(
          this.root,
          configuration,
          this.state.directions,
          this.state.online,
          lastBuilding,
          this.homeFallback(),
          {
            back: () => {
              this.state.directions = null;
              this.state.view = "home";
              this.render();
            },
            retry: async () => {
              await this.beginDirections(this.state.directions!.meeting);
            },
            acceptLowAccuracy: () => {
              if (this.state.directions) {
                this.state.directions.acceptedLowAccuracy = true;
              }
              this.render();
            },
            useFallback: (destination, disclosure) =>
              this.setFallbackOrigin(destination, disclosure),
            useDestinationOnly: () => {
              if (!this.state.directions) return;
              Object.assign(this.state.directions, {
                requesting: false,
                failureMessage: null,
                capturedPosition: null,
                assessment: null,
                fixedOrigin: null,
                destinationOnly: true,
                originDisclosure: null,
              });
              this.render();
            },
          },
        );
        break;
      }
      case "settings":
        renderSettings(this.root, configuration, {
          back: () => {
            this.state.view = "home";
            this.render();
          },
          showAbout: () => {
            this.state.view = "about";
            this.render();
          },
        });
        break;
      case "about":
        renderAbout(this.root, () => {
          this.state.view = "settings";
          this.render();
        });
        break;
    }
    this.renderUpdateBanner();
  }
}
