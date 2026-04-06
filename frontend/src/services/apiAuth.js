import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import api from './api';

const SESSION_KEY = 'anki_session_token';

/**
 * Native (Capacitor): load saved session token into axios and point at API base URL.
 * Web: no-op (cookies + same-origin / proxy).
 */
export async function initApiAuth() {
  if (!Capacitor.isNativePlatform()) return;

  const base = process.env.REACT_APP_API_URL;
  if (base) {
    api.defaults.baseURL = base;
  }
  api.defaults.withCredentials = false;

  const { value } = await Preferences.get({ key: SESSION_KEY });
  if (value) {
    api.defaults.headers.common.Authorization = `Bearer ${value}`;
  }
}

export async function setSessionToken(token) {
  if (!token) return;
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: SESSION_KEY, value: token });
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}

export async function clearSessionToken() {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: SESSION_KEY });
    delete api.defaults.headers.common.Authorization;
  }
}
