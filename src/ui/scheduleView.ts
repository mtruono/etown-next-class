import { Temporal } from "@js-temporal/polyfill";

import {
  expandSchedule,
  getMeetingsForCampusDate,
  getMeetingsForCampusWeek,
  getSameBuildingTransition,
} from "../domain/scheduleEngine";
import {
  formatCampusDate,
  formatCampusTime,
  formatDateTime,
} from "../domain/time";
import type {
  AppConfiguration,
  Destination,
  ExpandedMeeting,
  ScheduleState,
} from "../domain/types";
import { actionButton, element, viewShell } from "./elements";

export interface ScheduleActions {
  openSettings(): void;
  directions(meeting: ExpandedMeeting): void;
  directionsFromElsewhere(meeting: ExpandedMeeting): void;
  previewFromHome(meeting: ExpandedMeeting): void;
}

function displayTime(time: string): string {
  const value = Temporal.PlainTime.from(time);
  const hour = value.hour % 12 || 12;
  return `${hour}:${String(value.minute).padStart(2, "0")} ${value.hour >= 12 ? "PM" : "AM"}`;
}

function displayShortDate(date: Temporal.PlainDate): string {
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function countdown(
  meeting: ExpandedMeeting,
  now: ScheduleState["campusNow"],
): string {
  const milliseconds = Math.max(
    0,
    Number(meeting.start.epochMilliseconds - now.epochMilliseconds),
  );
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24)
    return `${hours} hr${hours === 1 ? "" : "s"}${remainder ? ` ${remainder} min` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function meetingDestination(
  configuration: AppConfiguration,
  meeting: ExpandedMeeting,
): Destination {
  const destination = configuration.destinations.find(
    ({ id }) => id === meeting.destinationId,
  );
  if (!destination) throw new Error("Meeting destination is unavailable");
  return destination;
}

function meetingCard(
  configuration: AppConfiguration,
  state: ScheduleState,
  meeting: ExpandedMeeting,
  heading: string,
  actions: ScheduleActions,
  options: { primary?: boolean; directions?: boolean } = {},
): HTMLElement {
  const destination = meetingDestination(configuration, meeting);
  const isVirtual = meeting.modality === "virtual";
  const stateClass =
    heading === "Current class" ? " class-card-current" : " class-card-next";
  return element(
    "article",
    {
      className: `class-card${stateClass}${options.primary ? " class-card-primary" : ""}`,
    },
    element(
      "div",
      { className: "card-topline" },
      element("p", { className: "card-label", text: heading }),
      element("p", { className: "course-code", text: meeting.courseCode }),
    ),
    element("h2", { className: "course-title", text: meeting.title }),
    isVirtual
      ? element("p", {
          className: "virtual-banner",
          text: `${meeting.replacementLabel ?? "Virtual"}. No walking directions are needed.`,
        })
      : element(
          "div",
          { className: "destination" },
          element("p", {
            className: "building",
            text: destination.displayName,
          }),
          element("p", { className: "room", text: `Room ${meeting.room}` }),
        ),
    element(
      "div",
      { className: "class-meta" },
      element("p", {
        className: "class-time",
        text: `${formatDateTime(meeting.start)}–${formatCampusTime(meeting.end)}`,
      }),
      heading === "Next class"
        ? element("p", {
            className: "countdown",
            text: `In ${countdown(meeting, state.campusNow)}`,
          })
        : null,
    ),
    !isVirtual && options.directions !== false
      ? actionButton(
          heading === "Current class"
            ? "Campus guide to current class"
            : `Campus guide to ${destination.displayName}, Room ${meeting.room}`,
          () => actions.directions(meeting),
          {
            className:
              heading === "Current class"
                ? "button button-secondary"
                : "button button-primary",
          },
        )
      : null,
  );
}

function remainingSchedule(
  configuration: AppConfiguration,
  state: ScheduleState,
): HTMLElement {
  const list = element("ol", { className: "schedule-list" });
  for (const meeting of state.remainingToday) {
    const destination = meetingDestination(configuration, meeting);
    list.append(
      element(
        "li",
        {},
        element("time", {
          text: displayTime(meeting.startTime),
          attributes: { datetime: meeting.start.toString() },
        }),
        element("span", { text: meeting.courseCode }),
        element("span", {
          text:
            meeting.modality === "virtual"
              ? "Virtual"
              : `${destination.displayName}, Room ${meeting.room}`,
        }),
      ),
    );
  }
  return element(
    "section",
    { className: "panel day-panel" },
    element(
      "div",
      { className: "section-heading" },
      element("h2", { text: "Today’s remaining schedule" }),
      state.remainingToday.length
        ? element("span", {
            className: "meeting-count",
            text: String(state.remainingToday.length),
            attributes: {
              "aria-label": `${state.remainingToday.length} meetings remaining`,
            },
          })
        : null,
    ),
    state.remainingToday.length
      ? list
      : element("p", { text: "Nothing else is scheduled today." }),
  );
}

function weeklySchedule(
  configuration: AppConfiguration,
  state: ScheduleState,
): HTMLElement {
  const anchor =
    state.phase === "before-term" && state.next
      ? state.next.start.toPlainDate()
      : state.campusNow.toPlainDate();
  const monday = anchor.subtract({ days: anchor.dayOfWeek - 1 });
  const friday = monday.add({ days: 4 });
  const meetings = getMeetingsForCampusWeek(
    expandSchedule(configuration),
    anchor,
  );
  const days = element("div", { className: "week-days" });

  for (let offset = 0; offset < 5; offset += 1) {
    const date = monday.add({ days: offset });
    const campusDate = date.toString();
    const dayMeetings = getMeetingsForCampusDate(meetings, date);
    const rule = configuration.dateRules.find(
      (candidate) => candidate.date === campusDate,
    );
    const dayList = element("ol", { className: "week-class-list" });

    for (const meeting of dayMeetings) {
      const destination = meetingDestination(configuration, meeting);
      dayList.append(
        element(
          "li",
          {},
          element("time", {
            text: displayTime(meeting.startTime),
            attributes: { datetime: meeting.start.toString() },
          }),
          element(
            "div",
            { className: "week-class-details" },
            element(
              "div",
              { className: "week-class-topline" },
              element("span", {
                className: "week-course-code",
                text: meeting.courseCode,
              }),
              meeting.modality === "virtual"
                ? element("span", {
                    className: "week-virtual-badge",
                    text: "Virtual",
                  })
                : null,
            ),
            element("p", { text: meeting.title }),
            element("p", {
              className: "week-location",
              text:
                meeting.modality === "virtual"
                  ? "Online"
                  : `${destination.displayName} · Room ${meeting.room}`,
            }),
          ),
        ),
      );
    }

    const isToday = campusDate === state.campusDate;
    days.append(
      element(
        "section",
        {
          className: `week-day${isToday ? " week-day-today" : ""}`,
          attributes: isToday ? { "aria-current": "date" } : undefined,
        },
        element(
          "div",
          { className: "week-day-heading" },
          element("h3", {
            text: date.toLocaleString("en-US", { weekday: "long" }),
          }),
          element("p", { text: displayShortDate(date) }),
        ),
        rule?.kind === "no-classes"
          ? element("p", { className: "week-note", text: rule.label })
          : rule?.kind === "replacement-weekday"
            ? element("p", { className: "week-note", text: rule.label })
            : null,
        dayMeetings.length
          ? dayList
          : element("p", {
              className: "week-empty",
              text:
                rule?.kind === "no-classes"
                  ? "No classes"
                  : "No classes scheduled",
            }),
      ),
    );
  }

  return element(
    "section",
    { className: "panel week-panel" },
    element(
      "div",
      { className: "section-heading week-heading" },
      element(
        "div",
        {},
        element("p", { className: "card-label", text: "Full schedule" }),
        element("h2", { text: "This week" }),
      ),
      element("p", {
        className: "week-range",
        text: `${displayShortDate(monday)}–${displayShortDate(friday)}`,
      }),
    ),
    days,
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
  const sameBuilding = getSameBuildingTransition(state.previous, state.next);
  const main = element("main", { className: "content-stack" });
  const liveSummary = state.current
    ? `Current class ${state.current.courseCode}.`
    : state.next
      ? `Next class ${state.next.courseCode}.`
      : state.phase === "finals-and-reading"
        ? "Regular classes have ended."
        : state.phase === "semester-complete"
          ? "This semester is complete."
          : "No more classes are scheduled.";
  main.append(
    element("p", {
      className: "visually-hidden",
      text: liveSummary,
      attributes: { role: "status", "aria-live": "polite" },
    }),
    element(
      "section",
      {
        className: "campus-clock",
        attributes: { "aria-label": "Elizabethtown campus time" },
      },
      element("p", { text: formatCampusDate(state.campusNow) }),
      element("time", {
        className: "campus-time",
        text: formatCampusTime(state.campusNow),
        attributes: { datetime: state.campusNow.toString() },
      }),
      Intl.DateTimeFormat().resolvedOptions().timeZone !==
        configuration.campus.timezone
        ? element("p", {
            className: "timezone-note",
            text: "Class times are shown in Elizabethtown campus time.",
          })
        : null,
    ),
  );

  if (!online) {
    main.append(
      element("p", {
        className: "offline-banner",
        text: "You are offline. The schedule and in-app campus schematic still work. GPS availability and accuracy depend on the phone.",
        attributes: { role: "status" },
      }),
    );
  }

  if (state.phase === "finals-and-reading") {
    main.append(
      element(
        "section",
        { className: "panel state-panel" },
        element("h2", { text: "Regular classes have ended" }),
        element("p", {
          text: "Regular classes have ended. Check the official final exam schedule for exam times and locations.",
        }),
      ),
    );
  } else if (state.phase === "semester-complete") {
    main.append(
      element(
        "section",
        { className: "panel state-panel" },
        element("h2", { text: "This semester is complete." }),
      ),
    );
  } else {
    if (state.noClassesReason) {
      main.append(
        element(
          "section",
          { className: "panel state-panel" },
          element("h2", {
            text: `No classes today: ${state.noClassesReason}.`,
          }),
        ),
      );
    } else if (state.afterLastClassToday) {
      main.append(
        element(
          "section",
          { className: "panel state-panel" },
          element("h2", { text: "No more classes today." }),
        ),
      );
    }

    if (state.informationalNote) {
      main.append(
        element("p", { className: "notice", text: state.informationalNote }),
      );
    }

    if (state.current) {
      const currentDestination = meetingDestination(
        configuration,
        state.current,
      );
      main.append(
        element("p", {
          className: "current-summary",
          text: `In class now · ${currentDestination.displayName}, Room ${state.current.room} · Ends ${formatCampusTime(state.current.end)}`,
        }),
        meetingCard(
          configuration,
          state,
          state.current,
          "Current class",
          actions,
          { directions: true },
        ),
      );
    }

    if (state.next) {
      const nextDestination = meetingDestination(configuration, state.next);
      if (sameBuilding.isSameBuilding && !state.current) {
        main.append(
          element(
            "section",
            { className: "panel same-building" },
            element("h2", {
              text: "Stay in the same building, if you’re still there",
            }),
            element("p", {
              text: `Your last scheduled class and your next class are both in ${nextDestination.displayName}. If you are still there, stay in the building and go to Room ${state.next.room}.`,
            }),
            actionButton(
              "I’m somewhere else, use my location",
              () => actions.directionsFromElsewhere(state.next!),
              {
                className: "button button-secondary",
              },
            ),
          ),
        );
      }
      main.append(
        meetingCard(configuration, state, state.next, "Next class", actions, {
          primary: !state.current,
          directions: !sameBuilding.isSameBuilding || state.current !== null,
        }),
      );
    } else if (state.phase === "regular-classes" && state.afterLastClassToday) {
      main.append(
        element("p", {
          className: "notice",
          text: "There are no later regular-class meetings in this configured term.",
        }),
      );
    }

    if (state.afterLastClassToday && state.next) {
      main.append(
        actionButton(
          "Preview tomorrow from Founders B",
          () => actions.previewFromHome(state.next!),
          {
            className: "button button-secondary",
          },
        ),
      );
    }
    main.append(
      remainingSchedule(configuration, state),
      weeklySchedule(configuration, state),
    );
  }

  root.append(
    viewShell("Etown Next Class", main, {
      headerAction: actionButton("Info", actions.openSettings, {
        className: "button button-header",
        ariaLabel: "Open app details",
      }),
    }),
  );
}
