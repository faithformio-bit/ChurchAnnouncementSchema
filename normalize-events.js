// Input fields expected from Google Calendar "Find Events" line-item output:
// id, summary, description, location, start, end, status, html_link,
// recurring_event_id, attendee_emails_or_count, start_time_zone
// Optional:
// days_ahead (default 120), now_iso

const data = inputData;

const firstNonEmpty = (...keys) => {
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== "") return data[k];
  }
  return undefined;
};

const toArray = (value) => {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // ignore parse error and continue
    }
    return value.split(",").map((s) => s.trim());
  }
  return [value];
};

const normalizeText = (v) => String(v || "").replace(/\s+/g, " ").trim();

const parseAttendeeCount = (raw) => {
  if (raw === undefined || raw === null || raw === "") return 0;
  const s = String(raw).trim();

  if (/^\d+$/.test(s)) return Number(s);

  if (s.includes("@")) {
    return s
      .split(/[,\n;]+/)
      .map((x) => x.trim())
      .filter(Boolean).length;
  }

  return 0;
};

const ids = toArray(firstNonEmpty("id", "results_id", "event_id"));
const summaries = toArray(firstNonEmpty("summary", "results_summary", "title"));
const descriptions = toArray(firstNonEmpty("description", "results_description", "details"));
const locations = toArray(firstNonEmpty("location", "results_location"));
const starts = toArray(firstNonEmpty("start", "event_begins", "start_datetime"));
const ends = toArray(firstNonEmpty("end", "event_ends", "end_datetime"));
const statuses = toArray(firstNonEmpty("status", "results_status"));
const links = toArray(firstNonEmpty("html_link", "results_html_link", "link"));
const recurringIds = toArray(firstNonEmpty("recurring_event_id", "results_recurring_event_id"));
const attendeeRaw = toArray(
  firstNonEmpty("attendee_emails_or_count", "results_attendee_emails", "attendee_count")
);
const timeZones = toArray(firstNonEmpty("start_time_zone", "results_start_time_zone", "time_zone"));

const maxLen = Math.max(
  ids.length,
  summaries.length,
  descriptions.length,
  locations.length,
  starts.length,
  ends.length,
  statuses.length,
  links.length,
  recurringIds.length,
  attendeeRaw.length,
  timeZones.length
);

const now = data.now_iso ? new Date(data.now_iso) : new Date();
const daysAhead = Number(data.days_ahead || 120);
const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

const events = [];
const seen = new Set();

for (let i = 0; i < maxLen; i++) {
  const start = starts[i];
  const end = ends[i];
  const status = normalizeText(statuses[i] || "confirmed").toLowerCase();

  if (!start || !end) continue;
  if (status && status !== "confirmed") continue;

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) continue;
  if (startDate < now || startDate > cutoff) continue;

  const event = {
    id: normalizeText(ids[i]),
    recurringEventId: normalizeText(recurringIds[i]),
    summary: normalizeText(summaries[i]),
    description: normalizeText(descriptions[i]),
    location: normalizeText(locations[i]),
    startISO: String(start),
    endISO: String(end),
    timeZone: normalizeText(timeZones[i]) || "America/New_York",
    attendeeCount: parseAttendeeCount(attendeeRaw[i]),
    htmlLink: normalizeText(links[i]),
    status
  };

  if (!event.summary) continue;

  const key = event.id
    ? `${event.id}|${event.startISO}`
    : `${event.recurringEventId}|${event.startISO}|${event.summary}`;
  if (seen.has(key)) continue;
  seen.add(key);

  events.push(event);
}

events.sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

const seriesMap = {};
for (const e of events) {
  const seriesKey = e.recurringEventId || e.id || e.summary;
  if (!seriesMap[seriesKey]) {
    seriesMap[seriesKey] = {
      seriesKey,
      summary: e.summary,
      description: e.description,
      location: e.location,
      occurrences: 0,
      totalAttendees: 0,
      starts: []
    };
  }
  seriesMap[seriesKey].occurrences += 1;
  seriesMap[seriesKey].totalAttendees += e.attendeeCount;
  seriesMap[seriesKey].starts.push(e.startISO);
}

const series = Object.values(seriesMap);

const formatDate = (iso, tz) => {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz || "America/New_York"
  }).format(dt);
};

const announcementLines = events.map((e) => {
  const when = formatDate(e.startISO, e.timeZone);
  const where = e.location ? ` at ${e.location}` : "";
  const who = e.attendeeCount ? ` (${e.attendeeCount} attendees)` : "";
  const details = e.description ? ` | ${e.description}` : "";
  return `${when} - ${e.summary}${who}${where}${details}`;
});

const totalAttendees = events.reduce((sum, e) => sum + (e.attendeeCount || 0), 0);

return {
  total_events: events.length,
  total_attendees: totalAttendees,
  total_series: series.length,
  events_json: JSON.stringify(events),
  series_json: JSON.stringify(series),
  announcements_text: announcementLines.join("\n")
};

