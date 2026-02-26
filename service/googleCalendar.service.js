import { google } from "googleapis";

// create OAuth client only if we have necessary env vars
let calendar = null;
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REDIRECT_URI &&
  process.env.GOOGLE_REFRESH_TOKEN
) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });
} else {
  console.warn("Google Calendar disabled: missing credentials in env");
}

export const createCalendarEvent = async (session) => {
  if (!calendar) {
    console.debug("createCalendarEvent skipped: calendar not configured");
    return null;
  }

  const event = {
    summary: session.title,
    description: session.description,
    start: {
      dateTime: session.date,
      timeZone: "Asia/Colombo",
    },
    end: {
      dateTime: new Date(
        new Date(session.date).getTime() + session.duration * 60000
      ),
      timeZone: "Asia/Colombo",
    },
    attendees: Array.isArray(session.participants)
      ? session.participants
          .map(p => p.userId && p.userId.email)
          .filter(Boolean)
          .map(email => ({ email }))
      : undefined,
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });

  return response.data.id; // 👈 This is the googleEventId
};

export const updateCalendarEvent = async (googleEventId, session) => {
  if (!calendar) {
    console.debug("updateCalendarEvent skipped: calendar not configured");
    return;
  }

  const event = {
    summary: session.title,
    description: session.description,
    start: {
      dateTime: session.date,
      timeZone: "Asia/Colombo",
    },
    end: {
      dateTime: new Date(
        new Date(session.date).getTime() + session.duration * 60000
      ),
      timeZone: "Asia/Colombo",
    },
    attendees: Array.isArray(session.participants)
      ? session.participants
          .map(p => p.userId && p.userId.email)
          .filter(Boolean)
          .map(email => ({ email }))
      : undefined,
  };

  await calendar.events.update({
    calendarId: "primary",
    eventId: googleEventId,
    resource: event,
  });
};

export const deleteCalendarEvent = async (googleEventId) => {
  await calendar.events.delete({
    calendarId: "primary",
    eventId: googleEventId,
  });
};
