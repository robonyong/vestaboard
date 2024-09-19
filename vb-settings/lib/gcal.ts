import { authenticate } from "@google-cloud/local-auth";
import fs from "fs/promises";
import { Auth, google } from "googleapis";
import path from "path";

const CREDENTIALS_PATH = path.join(
  process.cwd(),
  process.env.CALENDAR_CREDENTIALS_PATH!
);
const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS_PATH,
  scopes: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar",
  ],
});

const calendar = google.calendar({
  version: "v3",
  auth,
});

export async function getCalendar(calendarEmail: string) {
  const res = await calendar.calendars.get({
    calendarId: calendarEmail,
  });

  return res;
}
