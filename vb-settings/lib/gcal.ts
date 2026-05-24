import { google } from "googleapis";
import path from "path";

const getCredentialsPath = () => {
  const credentialsPath = process.env.CALENDAR_CREDENTIALS_PATH;

  if (!credentialsPath) {
    throw new Error(
      "CALENDAR_CREDENTIALS_PATH is required to initialize Google Calendar"
    );
  }

  return path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.join(process.cwd(), credentialsPath);
};

const auth = new google.auth.GoogleAuth({
  keyFile: getCredentialsPath(),
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
