import { Temporal } from "@js-temporal/polyfill";

import type { AppState, DirectionSession } from "./appState";
import { getScheduleState } from "../domain/scheduleState";
import type {
  AppConfiguration,
  Destination,
  ExpandedMeeting,
  RouteProviderId,
} from "../domain/types";
import { decodeSetupCode, encodeSetupCode } from "../import/setupCode";
import { takeSetupCodeFromFragment } from "../import/setupImport";
import { requestCurrentPosition } from "../location/geolocation";
import {
  assessCapturedLocation,
  eligibleLastBuilding,
} from "../location/locationDecision";
import type { RouteOrigin } from "../routes/types";
import {
  createConfigurationStore,
  type ConfigurationStore,
} from "../storage/configurationStore";
import {
  createPreferenceStore,
  type PreferenceStore,
} from "../storage/preferenceStore";
import { renderAbout } from "../ui/aboutView";
import { renderDirections } from "../ui/directionsView";
import { actionButton, element } from "../ui/elements";
import { renderOnboarding } from "../ui/onboardingView";
import { renderSchedule } from "../ui/scheduleView";
import { renderSettings } from "../ui/settingsView";

type NowProvider = () => Temporal.Instant | Temporal.ZonedDateTime;

export class AppController {
  private readonly configurationStore: ConfigurationStore;
  private readonly preferenceStore: PreferenceStore;
  private readonly now: NowProvider;
  private state: AppState;
  private clockTimer: number | null = null;
  private applyUpdate: (() => Promise<void>) | null = null;

  constructor(
    private readonly root: HTMLElement,
    storage: Storage = localStorage,
    now: NowProvider = () => Temporal.Now.instant(),
  ) {
    this.configurationStore = createConfigurationStore(storage);
    this.preferenceStore = createPreferenceStore(storage);
    this.now = now;
    const configuration = this.configurationStore.load();
    this.state = {
      view: configuration ? "home" : "onboarding",
      configuration,
      pendingConfiguration: null,
      importError: null,
      importNotice: null,
      provider: this.preferenceStore.getRouteProvider(),
      directions: null,
      exportedSetupCode: null,
      online: navigator.onLine,
      updateAvailable: false,
    };
  }

  async start(): Promise<void> {
    const fragment = takeSetupCodeFromFragment(window.location, window.history);
    if (fragment.hadFragment) {
      this.state.view = "onboarding";
      this.state.importNotice = fragment.code
        ? "A setup code was found in the link. Review it before saving."
        : "The setup fragment was malformed and was removed from the address.";
      if (fragment.code) await this.decodeForPreview(fragment.code);
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

  private async decodeForPreview(code: string): Promise<void> {
    this.state.importError = null;
    try {
      this.state.pendingConfiguration = await decodeSetupCode(code);
    } catch (error) {
      this.state.pendingConfiguration = null;
      this.state.importError =
        error instanceof Error
          ? error.message
          : "The setup code could not be read.";
    }
    this.render();
  }

  private destinationForMeeting(
    configuration: AppConfiguration,
    meeting: ExpandedMeeting,
  ): Destination {
    const destination = configuration.destinations.find(
      ({ id }) => id === meeting.destinationId,
    );
    if (!destination)
      throw new Error("The meeting destination is unavailable.");
    return destination;
  }

  private homeFallback(configuration: AppConfiguration): Destination {
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
    if (meeting.modality === "virtual" || !this.state.configuration) return;
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
        this.destinationForMeeting(this.state.configuration, meeting),
      );
    }
    this.render();
  }

  private previewFromHome(meeting: ExpandedMeeting): void {
    const configuration = this.state.configuration;
    if (!configuration || meeting.modality === "virtual") return;
    const home = this.homeFallback(configuration);
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
      destination.id === this.state.configuration?.homeFallbackDestinationId;
    const origin: RouteOrigin = {
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
    if (
      this.state.view !== "onboarding" &&
      this.state.view !== "about" &&
      !configuration
    ) {
      this.state.view = "onboarding";
      this.state.importNotice =
        "No valid schedule is configured on this device. Import a setup code to continue.";
    }

    switch (this.state.view) {
      case "onboarding":
        renderOnboarding(this.root, {
          pendingConfiguration: this.state.pendingConfiguration,
          existingConfiguration: configuration,
          error: this.state.importError,
          notice: this.state.importNotice,
          actions: {
            importCode: (code) => this.decodeForPreview(code),
            confirmImport: () => {
              if (!this.state.pendingConfiguration) return;
              this.configurationStore.save(this.state.pendingConfiguration);
              this.state.configuration = this.state.pendingConfiguration;
              this.state.pendingConfiguration = null;
              this.state.importError = null;
              this.state.importNotice = null;
              this.state.view = "home";
              this.render();
            },
            cancelPreview: () => {
              this.state.pendingConfiguration = null;
              this.state.importError = null;
              this.render();
            },
            showPrivacy: () => {
              this.state.view = "about";
              this.render();
            },
            backToSchedule: () => {
              this.state.pendingConfiguration = null;
              this.state.view = "home";
              this.render();
            },
          },
        });
        break;
      case "home": {
        if (!configuration) break;
        const scheduleState = getScheduleState(configuration, this.now());
        renderSchedule(
          this.root,
          configuration,
          scheduleState,
          this.state.online,
          {
            openSettings: () => {
              this.state.view = "settings";
              this.state.exportedSetupCode = null;
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
        if (!configuration || !this.state.directions) {
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
          this.state.provider,
          this.state.online,
          lastBuilding,
          this.homeFallback(configuration),
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
              if (this.state.directions)
                this.state.directions.acceptedLowAccuracy = true;
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
                originDisclosure:
                  "No starting point will be supplied. The campus option opens the official building search; Apple or Google may use the device location.",
              });
              this.render();
            },
          },
        );
        break;
      }
      case "settings":
        if (!configuration) break;
        renderSettings(
          this.root,
          configuration,
          this.state.provider,
          this.state.exportedSetupCode,
          {
            back: () => {
              this.state.view = "home";
              this.render();
            },
            setProvider: (provider: RouteProviderId) => {
              this.preferenceStore.setRouteProvider(provider);
              this.state.provider = provider;
              this.render();
            },
            exportCode: async () => {
              this.state.exportedSetupCode =
                await encodeSetupCode(configuration);
              this.render();
            },
            replaceSchedule: () => {
              this.state.pendingConfiguration = null;
              this.state.importError = null;
              this.state.importNotice = null;
              this.state.view = "onboarding";
              this.render();
            },
            eraseSchedule: () => {
              if (
                !window.confirm(
                  "Erase the schedule and all Etown Next Class preferences from this device?",
                )
              )
                return;
              this.configurationStore.eraseAllAppData();
              this.state.configuration = null;
              this.state.pendingConfiguration = null;
              this.state.provider = "concept3d";
              this.state.exportedSetupCode = null;
              this.state.importNotice =
                "The saved schedule and preferences were erased from this device.";
              this.state.view = "onboarding";
              this.render();
            },
            showAbout: () => {
              this.state.view = "about";
              this.render();
            },
          },
        );
        break;
      case "about":
        renderAbout(this.root, () => {
          this.state.view = this.state.configuration
            ? "settings"
            : "onboarding";
          this.render();
        });
        break;
    }
    this.renderUpdateBanner();
  }
}
