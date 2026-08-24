import { Temporal } from "@js-temporal/polyfill";

import type { AppState, DirectionSession } from "./appState";
import { demoSchedule } from "../data/demoSchedule";
import { getScheduleState } from "../domain/scheduleState";
import type {
  AppConfiguration,
  ExpandedMeeting,
  RouteProviderId,
} from "../domain/types";
import { requestCurrentPosition } from "../location/geolocation";
import { assessCapturedLocation } from "../location/locationDecision";
import {
  createClassNavigationTarget,
  createHomeNavigationTarget,
  destinationForTarget,
  type NavigationTarget,
} from "../navigation/navigationTarget";
import {
  externalProvider,
  selectRouteProvider,
} from "../navigation/providerSelection";
import { buildProviderUrl, toRouteDestination } from "../routes/routeService";
import { createConfigurationStore } from "../storage/configurationStore";
import {
  createPreferenceStore,
  type PreferenceStore,
} from "../storage/preferenceStore";
import { TelemetryClient } from "../telemetry/telemetry";
import { renderAbout } from "../ui/aboutView";
import { renderDirections } from "../ui/directionsView";
import { actionButton, element } from "../ui/elements";
import { renderSchedule } from "../ui/scheduleView";
import { renderSettings } from "../ui/settingsView";

type NowProvider = () => Temporal.Instant | Temporal.ZonedDateTime;
type NavigationLauncher = (url: string) => void;

export class AppController {
  private readonly now: NowProvider;
  private readonly launchNavigation: NavigationLauncher;
  private readonly preferences: PreferenceStore;
  private readonly telemetry: TelemetryClient;
  private state: AppState;
  private clockTimer: number | null = null;
  private applyUpdate: (() => Promise<void>) | null = null;

  constructor(
    private readonly root: HTMLElement,
    now: NowProvider = () => Temporal.Now.instant(),
    configuration: AppConfiguration = demoSchedule,
    launchNavigation: NavigationLauncher = (url) => window.location.assign(url),
    telemetry: TelemetryClient = new TelemetryClient({
      endpoint: "",
      enabled: false,
    }),
    private readonly onForget: () => void = () => window.location.reload(),
  ) {
    this.now = now;
    this.launchNavigation = launchNavigation;
    this.preferences = createPreferenceStore(window.localStorage);
    this.telemetry = telemetry;
    this.state = {
      view: "home",
      configuration,
      directions: null,
      online: navigator.onLine,
      updateAvailable: false,
    };
  }

  start(): void {
    window.addEventListener("online", () => {
      this.state.online = true;
      this.render();
    });
    window.addEventListener("offline", () => {
      this.state.online = false;
      this.render();
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && this.state.view === "directions") {
        this.state.view = "home";
        this.state.directions = null;
        this.render();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (
        document.visibilityState === "visible" &&
        this.state.view === "home"
      ) {
        this.render();
      }
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

  private makeDirectionSession(target: NavigationTarget): DirectionSession {
    return {
      target,
      requesting: true,
      failureMessage: null,
      capturedPosition: null,
      assessment: null,
      chosenProvider: null,
      launchUrl: null,
    };
  }

  private targetForMeeting(meeting: ExpandedMeeting): NavigationTarget {
    const destination = this.state.configuration.destinations.find(
      ({ id }) => id === meeting.destinationId,
    );
    if (!destination) throw new Error("The class destination is unavailable.");
    return createClassNavigationTarget(meeting, destination);
  }

  private buildUrl(
    session: DirectionSession,
    provider: RouteProviderId,
  ): string {
    const destination = destinationForTarget(
      this.state.configuration,
      session.target,
    );
    const origin =
      provider === "concept3d" &&
      session.capturedPosition &&
      session.assessment?.classification === "on-campus"
        ? {
            latitude: session.capturedPosition.latitude,
            longitude: session.capturedPosition.longitude,
            name: "Current location",
          }
        : null;
    return buildProviderUrl(
      this.state.configuration,
      provider,
      origin,
      toRouteDestination(
        destination,
        session.target.kind === "class" ? session.target.room : undefined,
      ),
    );
  }

  private launchSession(
    session: DirectionSession,
    provider: RouteProviderId,
  ): void {
    try {
      const url = this.buildUrl(session, provider);
      session.requesting = false;
      session.failureMessage = null;
      session.chosenProvider = provider;
      session.launchUrl = url;
      this.render();
      void this.telemetry.track("map_launch_attempted", {
        target: session.target.kind,
        provider,
      });
      this.launchNavigation(url);
    } catch {
      session.requesting = false;
      session.failureMessage =
        "Choose another map or try the navigation request again.";
      this.render();
    }
  }

  private async beginNavigation(target: NavigationTarget): Promise<void> {
    void this.telemetry.track(
      target.kind === "home"
        ? "take_me_home_tapped"
        : "take_me_to_class_tapped",
      { target: target.kind },
    );
    const session = this.makeDirectionSession(target);
    this.state.directions = session;
    this.state.view = "directions";
    this.render();
    if (!this.state.online) {
      session.requesting = false;
      this.render();
      return;
    }

    const result = await requestCurrentPosition();
    if (this.state.directions !== session) return;
    const preferences = this.preferences.getNavigationPreferences();
    let provider: RouteProviderId;
    if (result.ok) {
      session.capturedPosition = result.position;
      session.assessment = assessCapturedLocation(
        this.state.configuration,
        result.position,
        destinationForTarget(this.state.configuration, target),
      );
      provider = selectRouteProvider(
        session.assessment.classification,
        preferences,
        navigator.userAgent,
      );
    } else {
      const failureEvent =
        result.code === "permission-denied"
          ? "location_permission_denied"
          : result.code === "timeout"
            ? "location_timeout"
            : "location_unavailable";
      void this.telemetry.track(failureEvent, { target: target.kind });
      provider = externalProvider(preferences.external, navigator.userAgent);
    }
    this.launchSession(session, provider);
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
        renderSchedule(
          this.root,
          configuration,
          getScheduleState(configuration, this.now()),
          this.state.online,
          {
            openSettings: () => {
              this.state.view = "settings";
              this.render();
            },
            takeToClass: (meeting) =>
              this.beginNavigation(this.targetForMeeting(meeting)),
            takeHome: () =>
              this.beginNavigation(createHomeNavigationTarget(configuration)),
          },
        );
        break;
      }
      case "directions": {
        const session = this.state.directions;
        if (!session) {
          this.state.view = "home";
          this.render();
          return;
        }
        renderDirections(this.root, configuration, session, this.state.online, {
          back: () => {
            this.state.directions = null;
            this.state.view = "home";
            this.render();
          },
          retry: () => this.beginNavigation(session.target),
          launchWith: (provider) => this.launchSession(session, provider),
          takeHome: () =>
            this.beginNavigation(createHomeNavigationTarget(configuration)),
        });
        break;
      }
      case "settings":
        renderSettings(
          this.root,
          configuration,
          this.preferences.getNavigationPreferences(),
          this.preferences.getTelemetryEnabled(),
          {
            back: () => {
              this.state.view = "home";
              this.render();
            },
            showAbout: () => {
              this.state.view = "about";
              this.render();
            },
            setCampusProvider: (provider) => {
              this.preferences.setCampusProvider(provider);
              this.render();
            },
            setExternalProvider: (provider) => {
              this.preferences.setExternalProvider(provider);
              this.render();
            },
            setTelemetryEnabled: (enabled) => {
              void this.telemetry.setEnabled(enabled);
              this.preferences.setTelemetryEnabled(enabled);
              this.render();
            },
            forgetAppData: () => {
              createConfigurationStore(window.localStorage).eraseAllAppData();
              const sessionKeys: string[] = [];
              for (
                let index = 0;
                index < window.sessionStorage.length;
                index += 1
              ) {
                const key = window.sessionStorage.key(index);
                if (key?.startsWith("etown-next-class.")) sessionKeys.push(key);
              }
              sessionKeys.forEach((key) =>
                window.sessionStorage.removeItem(key),
              );
              this.destroy();
              this.onForget();
            },
          },
        );
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
