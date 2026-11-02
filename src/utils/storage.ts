import { BASELINE_DATE, INITIAL_STUDENTS, DUTY_DEFINITIONS } from './cycleEngine';
import { AppRosterData, Student } from '../types/roster';

const STORAGE_KEY = 'srsh_hostel_roster_v1';

// Simple asynchronous SHA-256 hash using Web Crypto API
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Default initial state (synchronous for immediate instant render)
// SHA-256 for initial default password "admin123"
export const DEFAULT_ADMIN_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

// SHA-256 for initial default student password "12345"
export const DEFAULT_STUDENT_HASH = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';

export async function verifyStudentPassword(student: Student, passwordAttempt: string): Promise<boolean> {
  const hash = await hashPassword(passwordAttempt.trim());
  const expectedHash = student.passwordHash || DEFAULT_STUDENT_HASH;
  return hash === expectedHash;
}

export function getDefaultSyncRosterData(): AppRosterData {
  return {
    baselineDate: BASELINE_DATE,
    students: INITIAL_STUDENTS.map((s) => ({
      ...s,
      passwordHash: DEFAULT_STUDENT_HASH,
    })),
    duties: [...DUTY_DEFINITIONS],
    penalties: [],
    overrides: {},
    completedDuties: {},
    adminPasswordHash: DEFAULT_ADMIN_HASH,
    isPasswordSet: false,
    lastUpdated: Date.now(),
  };
}

export function sanitizeRosterData(raw: Partial<AppRosterData> | null | undefined): AppRosterData {
  const fallback = getDefaultSyncRosterData();
  if (!raw) return fallback;

  // Auto-heal old typo hash or missing hash if password was never set
  let resolvedHash = raw.adminPasswordHash || fallback.adminPasswordHash;
  if (resolvedHash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa82280f1a7ca47dd') {
    resolvedHash = DEFAULT_ADMIN_HASH;
  }

  const rawStudents = (Array.isArray(raw.students) && raw.students.length > 0) ? raw.students : fallback.students;
  const sanitizedStudents = rawStudents.map((s) => ({
    ...s,
    passwordHash: s.passwordHash || DEFAULT_STUDENT_HASH,
  }));

  const rawDuties = (Array.isArray(raw.duties) && raw.duties.length > 0) ? raw.duties : DUTY_DEFINITIONS;

  return {
    baselineDate: raw.baselineDate || fallback.baselineDate,
    students: sanitizedStudents,
    duties: rawDuties,
    penalties: Array.isArray(raw.penalties) ? raw.penalties : [],
    overrides: raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {},
    completedDuties: raw.completedDuties && typeof raw.completedDuties === 'object' ? raw.completedDuties : {},
    adminPasswordHash: resolvedHash,
    isPasswordSet: typeof raw.isPasswordSet === 'boolean' ? raw.isPasswordSet : false,
    lastUpdated: raw.lastUpdated || Date.now(),
  };
}

export async function getDefaultRosterData(): Promise<AppRosterData> {
  return getDefaultSyncRosterData();
}

// LocalStorage helpers
export function loadRosterData(): AppRosterData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return sanitizeRosterData(data);
  } catch (err) {
    console.error('Failed to load roster data from storage:', err);
    return null;
  }
}

export function saveRosterData(data: AppRosterData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save roster data to storage:', err);
  }
}

// Server API helpers for Live Sync across all phones
export async function fetchServerRoster(): Promise<AppRosterData | null> {
  try {
    const res = await fetch('/api/roster');
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return sanitizeRosterData(json.data);
    }
  } catch (err) {
    console.warn('Server roster fetch unavailable (using local cache):', err);
  }
  return null;
}

export async function pushServerRoster(data: AppRosterData): Promise<number | null> {
  try {
    const res = await fetch('/api/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.lastUpdated) {
      return json.lastUpdated as number;
    }
  } catch (err) {
    console.warn('Failed to push roster update to server:', err);
  }
  return null;
}

export const CANONICAL_APP_URL = 'https://ais-dev-ja5v3umepezt6rullke4rw-989925381338.asia-southeast1.run.app';
export const SHARED_APP_URL = 'https://ais-pre-ja5v3umepezt6rullke4rw-989925381338.asia-southeast1.run.app';

const STUDENT_USER_KEY = 'hostel_roster_logged_in_student_id';

export function getStoredStudentId(): string | null {
  try {
    return localStorage.getItem(STUDENT_USER_KEY);
  } catch {
    return null;
  }
}

export function setStoredStudentId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STUDENT_USER_KEY, id);
    } else {
      localStorage.removeItem(STUDENT_USER_KEY);
    }
  } catch {
    // Ignore
  }
}

export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') return CANONICAL_APP_URL;
  const hostname = window.location.hostname;
  // If running inside Google AI Studio preview or localhost, use the public cloud endpoint so phone access works
  if (hostname.includes('aistudio.google.com') || hostname === 'localhost' || hostname === '127.0.0.1') {
    return CANONICAL_APP_URL;
  }
  return window.location.origin;
}

// Shareable URL with optional embedded state snapshot
export function generateShareUrl(data?: AppRosterData, includeSnapshot: boolean = false): string {
  const origin = getPublicAppUrl();
  const path = window.location.pathname.startsWith('/api') ? '/' : window.location.pathname;
  const baseUrl = `${origin}${path === '/' ? '' : path}`;
  if (!includeSnapshot || !data) {
    return `${baseUrl}/?live=1`;
  }
  try {
    // Compress lightweight JSON into base64 url hash
    const lightweight = {
      b: data.baselineDate,
      s: data.students,
      p: data.penalties,
      o: data.overrides,
      c: data.completedDuties,
      u: Date.now(),
    };
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(lightweight)))));
    return `${baseUrl}#roster=${encoded}`;
  } catch (e) {
    console.error('Failed to generate snapshot URL:', e);
    return baseUrl;
  }
}

export function readUrlSnapshot(): Partial<AppRosterData> | null {
  try {
    const hash = window.location.hash;
    if (hash && hash.includes('#roster=')) {
      const b64 = decodeURIComponent(hash.replace('#roster=', ''));
      const jsonStr = decodeURIComponent(escape(atob(b64)));
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.s)) {
        return {
          baselineDate: parsed.b || BASELINE_DATE,
          students: parsed.s,
          penalties: parsed.p || [],
          overrides: parsed.o || {},
          completedDuties: parsed.c || {},
          lastUpdated: parsed.u || Date.now(),
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse URL snapshot:', e);
  }
  return null;
}

export function exportRosterJSON(data: AppRosterData): string {
  return JSON.stringify(data, null, 2);
}

export function importRosterJSON(jsonString: string): AppRosterData | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.students && Array.isArray(parsed.students)) {
      saveRosterData(parsed);
      pushServerRoster(parsed);
      return parsed;
    }
  } catch (e) {
    console.error('Invalid JSON import', e);
  }
  return null;
}
