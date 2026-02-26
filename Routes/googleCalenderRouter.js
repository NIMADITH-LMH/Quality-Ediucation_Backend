import { Router } from 'express';
import { createOAuthClient, getAuthUrl, saveTokens, getAuthedClient } from '../utils/googleCalender.js';
import { google } from 'googleapis';

const router = Router();

// 1) Redirect user to Google consent
router.get('/auth', (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// 2) Callback to exchange code for tokens
router.get('/callback', async (req, res, next) => {
  try {
    const code = req.query.code;
    const oAuth2Client = createOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    await saveTokens(tokens); // persist securely (DB recommended)
    res.json({ msg: 'Google OAuth successful' });
  } catch (err) { next(err); }
});

// 3) Create an event (server-side)
router.post('/events', async (req, res, next) => {
  try {
    const auth = await getAuthedClient();
    const calendar = google.calendar({ version: 'v3', auth });
    const event = {
      summary: req.body.summary || 'New session',
      description: req.body.description || '',
      start: { dateTime: req.body.start, timeZone: req.body.timeZone || 'UTC' },
      end: { dateTime: req.body.end, timeZone: req.body.timeZone || 'UTC' },
    };
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const response = await calendar.events.insert({ calendarId, resource: event });
    res.status(201).json(response.data);
  } catch (err) { next(err); }
});

export default router;