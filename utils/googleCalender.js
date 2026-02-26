import fs from 'fs/promises';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = process.env.TOKEN_STORE_PATH || './google-tokens.json';

export const createOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

export const getAuthUrl = () => {
  const oAuth2Client = createOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
};

export const saveTokens = async (tokens) => {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens), { mode: 0o600 });
};

export const loadTokens = async () => {
  try {
    const raw = await fs.readFile(TOKEN_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getAuthedClient = async () => {
  const oAuth2Client = createOAuthClient();
  const tokens = await loadTokens();
  if (!tokens) throw new Error('No stored Google tokens');
  oAuth2Client.setCredentials(tokens);
  return oAuth2Client;
};