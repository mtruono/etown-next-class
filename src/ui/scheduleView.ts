import { Temporal } from "@js-temporal/polyfill";

import {
  expandSchedule,
  getMeetingsForCampusDate,
  getMeetingsForCampusWeek,
  getSameBuildingTransition,
} from "../domain/scheduleEngine";
import { formatCampusDate, formatCampusTime } from "../domain/time";
import type {
  AppConfiguration,
  Destination,
  ExpandedMeeting,
  ScheduleState,
} from "../domain/types";
import { actionButton, element, viewShell } from "./elements";

export interface ScheduleActions {
  openSettings(): void;
  takeToClass(meeting: ExpandedMeeting): void;
  takeHome(): void;
}

function destinationForMeeting(
  configuration: AppConfiguration,
  meeting: ExpandedMeeting,
): Destination {
  const destination = configuration.destinations.find(
    ({ id }) => id === meeting.destinationId,
  );
  if (!destination) throw new Error("Meeting destination is unavailable");
  return destination;
}

function displayTime(value: string | Temporal.ZonedDateTime): string {
  const time =
    typeof value === "string" ? Temporal.PlainTime.from(value) : value;
  const hour = time.hour % 12 || 12;
  return `${hour}:${String(time.minute).padStart(2, "0")} ${time.hour >= 12 ? "PM" : "AM"}`;
}

function countdown(
  meeting: ExpandedMeeting,
  now: ScheduleState["campusNow"],
): string {
  const minutes = Math.max(
    0,
    Math.ceil(
      Number(meeting.start.epochMilliseconds - now.epochMilliseconds) / 60_000,
    ),
  );
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours} hr${hours === 1 ? "" : "s"}${remainder ? ` ${remainder} min` : ""}`;
  }
  const days = Math.floor(minutes / (24 * 60));
  return `${days} day${days === 1 ? "" : "s"}`;
}

function meetingLocation(
  configuration: AppConfiguration,
  meeting: ExpandedMeeting,
): string {
  if (meeting.modality === "virtual") return "Online · Virtual class";
  const destination = destinationForMeeting(configuration, meeting);
  return `${destination.displayName} · Room ${meeting.room}`;
}

function primaryCard(
  configuration: AppConfiguration,
  state: ScheduleState,
  actions: ScheduleActions,
): HTMLElement {
  const primary = state.current ?? state.next;
  const isCurrent = Boolean(state.current);
  const noClassToday =
    Boolean(state.noClassesReason) || state.today.length === 0;
  const doneToday = state.afterLastClassToday && !isCurrent;

  if (!primary) {
    return element(
      "section",
      { className: "assistant-card assistant-card-empty" },
      element("p", { className: "assistant-kicker", text: "ALL SET" }),
      element("h2", {
        text:
          state.phase === "semester-complete"
            ? "This semester is complete"
            : "No more classes are scheduled",
      }),
      element("p", {
        text: "Your take-me-home button is still ready whenever you need it.",
      }),
    );
  }

  const destination = destinationForMeeting(configuration, primary);
  let status: string;
  if (isCurrent) status = "IN CLASS NOW";
  else if (doneToday) status = "YOU’RE DONE FOR TODAY";
  else if (noClassToday)
    status = state.noClassesReason?.toUpperCase() ?? "NO CLASSES TODAY";
  else
    status = `NEXT CLASS IN ${countdown(primary, state.campusNow).toUpperCase()}`;

  return element(
    "section",
    { className: "assistant-card" },
    element("p", { className: "assistant-kicker", text: status }),
    doneToday || (noClassToday && !isCurrent)
      ? element("p", {
          className: "next-date",
          text: `Next: ${primary.start.toLocaleString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}`,
        })
      : null,
    element("p", {
      className: "assistant-course-code",
      text: primary.courseCode,
    }),
    element("h2", { className: "assistant-course", text: primary.title }),
    primary.modality === "virtual"
      ? element("p", { className: "assistant-building", text: "Virtual class" })
      : element(
          "div",
          { className: "assistant-destination" },
          element("p", {
            className: "assistant-building",
            text: destination.displayName,
          }),
          element("p", {
            className: "assistant-room",
            text: `Room ${primary.room}`,
          }),
        ),
    element("p", {
      className: "assistant-time",
      text: `${displayTime(primary.start)}–${displayTime(primary.end)}`,
    }),
    isCurrent
      ? element("p", {
          className: "class-end",
          text: `Ends at ${displayTime(primary.end)}`,
        })
      : null,
    primary.modality === "in-person"
      ? actionButton("TAKE ME TO CLASS", () => actions.takeToClass(primary), {
          className: "button assistant-class-button",
          ariaLabel: `Take me to ${destination.displayName}, Room ${primary.room}`,
        })
      : element("p", {
          className: "virtual-banner",
          text: `${primary.replacementLabel ?? "Virtual class"}. No walking directions are needed.`,
        }),
  );
}

function sameBuildingMessage(
  configuration: AppConfiguration,
  state: ScheduleState,
  actions: ScheduleActions,
): HTMLElement | null {
  const transition = getSameBuildingTransition(state.previous, state.next);
  if (!transition.isSameBuilding || !state.next || state.current) return null;
  const destination = destinationForMeeting(configuration, state.next);
  return element(
    "aside",
    { className: "same-building-assist" },
    element("p", {
      text: `Stay in ${destination.displayName} and go to Room ${state.next.room}.`,
    }),
    actionButton("I’m somewhere else", () => actions.takeToClass(state.next!), {
      className: "button button-text",
    }),
  );
}

function nextAfterCurrent(
  configuration: AppConfiguration,
  state: ScheduleState,
): HTMLElement | null {
  if (!state.current || !state.next) return null;
  return element(
    "aside",
    { className: "next-glance" },
    element("span", { text: "Next" }),
    element("strong", {
      text: `${displayTime(state.next.start)} · ${meetingLocation(configuration, state.next)}`,
    }),
  );
}

function scheduleRow(
  configuration: AppConfiguration,
  meeting: ExpandedMeeting,
): HTMLLIElement {
  return element(
    "li",
    {},
    element("time", {
      text: displayTime(meeting.start),
      attributes: { datetime: meeting.start.toString() },
    }),
    element(
      "div",
      {},
      element("strong", { text: meeting.courseCode }),
      element("span", { text: meeting.title }),
      element("span", {
        className: "schedule-location",
        text: meetingLocation(configuration, meeting),
      }),
    ),
  );
}

function todayDisclosure(
  configuration: AppConfiguration,
  state: ScheduleState,
): HTMLDetailsElement {
  const list = element("ol", { className: "assistant-schedule-list" });
  state.today.forEach((meeting) =>
    list.append(scheduleRow(configuration, meeting)),
  );
  return element(
    "details",
    { className: "schedule-disclosure" },
    element(
      "summary",
      {},
      element("span", { text: "Today’s schedule" }),
      element("span", {
        text: `${state.today.length} ${state.today.length === 1 ? "class" : "classes"}`,
      }),
    ),
    state.noClassesReason
      ? element("p", {
          className: "schedule-note",
          text: state.noClassesReason,
        })
      : state.today.length
        ? list
        : element("p", {
            className: "schedule-note",
            text: "No classes today.",
          }),
  );
}

function weekDisclosure(
  configuration: AppConfiguration,
  state: ScheduleState,
): HTMLDetailsElement {
  const anchor =
    state.phase === "before-term" && state.next
      ? state.next.start.toPlainDate()
      : state.campusNow.toPlainDate();
  const monday = anchor.subtract({ days: anchor.dayOfWeek - 1 });
  const meetings = getMeetingsForCampusWeek(
    expandSchedule(configuration),
    anchor,
  );
  const week = element("div", { className: "assistant-week" });

  for (let offset = 0; offset < 5; offset += 1) {
    const date = monday.add({ days: offset });
    const dayMeetings = getMeetingsForCampusDate(meetings, date);
    const list = element("ol", { className: "assistant-schedule-list" });
    dayMeetings.forEach((meeting) =>
      list.append(scheduleRow(configuration, meeting)),
    );
    const rule = configuration.dateRules.find(
      ({ date: ruleDate }) => ruleDate === date.toString(),
    );
    week.append(
      element(
        "section",
        {
          className: `assistant-week-day${date.toString() === state.campusDate ? " is-today" : ""}`,
          attributes:
            date.toString() === state.campusDate
              ? { "aria-current": "date" }
              : undefined,
        },
        element(
          "h3",
          {},
          element("span", {
            text: date.toLocaleString("en-US", { weekday: "long" }),
          }),
          element("span", {
            text: date.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
            }),
          }),
        ),
        rule?.kind === "no-classes"
          ? element("p", { className: "schedule-note", text: rule.label })
          : dayMeetings.length
            ? list
            : element("p", { className: "schedule-note", text: "No classes" }),
      ),
    );
  }

  return element(
    "details",
    { className: "schedule-disclosure" },
    element(
      "summary",
      {},
      element("span", { text: "This week" }),
      element("span", { text: "Monday–Friday" }),
    ),
    week,
  );
}

export function renderSchedule(
  root: HTMLElement,
  configuration: AppConfiguration,
  state: ScheduleState,
  online: boolean,
  actions: ScheduleActions,
): void {
  root.replaceChildren();
  const main = element("main", { className: "assistant-main" });
  main.append(
    element(
      "section",
      {
        className: "assistant-clock",
        attributes: { "aria-label": "Campus time" },
      },
      element("span", { text: formatCampusDate(state.campusNow) }),
      element("time", {
        text: formatCampusTime(state.campusNow),
        attributes: { datetime: state.campusNow.toString() },
      }),
    ),
  );
  if (!online) {
    main.append(
      element("p", {
        className: "offline-banner",
        text: "You’re offline. Your saved schedule is still available; live navigation needs a connection.",
        attributes: { role: "status" },
      }),
    );
  }
  if (state.informationalNote) {
    main.append(
      element("p", { className: "notice", text: state.informationalNote }),
    );
  }
  main.append(primaryCard(configuration, state, actions));
  const followingClass = nextAfterCurrent(configuration, state);
  if (followingClass) main.append(followingClass);
  const sameBuilding = sameBuildingMessage(configuration, state, actions);
  if (sameBuilding) main.append(sameBuilding);
  main.append(
    element(
      "nav",
      {
        className: "schedule-links",
        attributes: { "aria-label": "Schedule views" },
      },
      todayDisclosure(configuration, state),
      weekDisclosure(configuration, state),
    ),
  );

  const fragment = viewShell("Etown Campus Assistant", main, {
    headerAction: actionButton("Settings", actions.openSettings, {
      className: "button button-header",
      ariaLabel: "Open settings",
    }),
  });
  fragment.append(
    element(
      "div",
      { className: "home-dock" },
      actionButton("TAKE ME HOME", actions.takeHome, {
        className: "button home-button",
        ariaLabel: "Take me home to Founders B",
      }),
      element("span", { text: "Founders B" }),
    ),
  );
  root.append(fragment);
}
