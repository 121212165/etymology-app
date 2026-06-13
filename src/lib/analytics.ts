type EventType = "ttfi" | "review_complete" | "decompose_use" | "session" | "next_day_retention";

interface AnalyticsEvent {
  type: EventType;
  timestamp: number;
  data: Record<string, unknown>;
  sessionId: string;
}

interface SessionStartData {
  path: string;
}

interface SessionEndData {
  path: string;
  duration: number;
}

interface TTFIData {
  word: string;
  ttfiMs: number;
}

interface ReviewCompleteData {
  word: string;
  result: "pass" | "fail";
  timeSpentMs: number;
}

interface DecomposeUseData {
  word: string;
  partsCount: number;
}

interface NextDayRetentionData {
  returnedWithin24h: boolean;
  lastSessionGap: number;
}

const STORAGE_KEY = "linxu-events";
const SESSION_ID_KEY = "linxu-session-id";
const LAST_SESSION_KEY = "linxu-last-session";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

function loadEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // storage full or unavailable
  }
}

export function track(type: EventType, data: Record<string, unknown>): void {
  const event: AnalyticsEvent = {
    type,
    timestamp: Date.now(),
    data,
    sessionId: getSessionId(),
  };
  const events = loadEvents();
  events.push(event);
  saveEvents(events);
}

export function flush(): void {
  const events = loadEvents();
  console.log(JSON.stringify(events, null, 2));
}

export function getMetrics(): {
  totalEvents: number;
  sessionCount: number;
  ttfi: { avg: number; min: number; max: number; count: number };
  reviewComplete: { passRate: number; total: number };
  decomposeUse: { total: number; avgParts: number };
  nextDayRetention: { returnRate: number; total: number };
} {
  const events = loadEvents();
  const sessions = new Set(events.map((e) => e.sessionId));

  const ttfiEvents = events.filter((e) => e.type === "ttfi");
  const ttfiValues = ttfiEvents.map((e) => (e.data as unknown as TTFIData).ttfiMs);
  const ttfiAvg = ttfiValues.length ? ttfiValues.reduce((a, b) => a + b, 0) / ttfiValues.length : 0;
  const ttfiMin = ttfiValues.length ? Math.min(...ttfiValues) : 0;
  const ttfiMax = ttfiValues.length ? Math.max(...ttfiValues) : 0;

  const reviewEvents = events.filter((e) => e.type === "review_complete");
  const passCount = reviewEvents.filter((e) => (e.data as unknown as ReviewCompleteData).result === "pass").length;
  const passRate = reviewEvents.length ? passCount / reviewEvents.length : 0;

  const decomposeEvents = events.filter((e) => e.type === "decompose_use");
  const totalParts = decomposeEvents.reduce((sum, e) => sum + ((e.data as unknown as DecomposeUseData).partsCount || 0), 0);
  const avgParts = decomposeEvents.length ? totalParts / decomposeEvents.length : 0;

  const retentionEvents = events.filter((e) => e.type === "next_day_retention");
  const returnedCount = retentionEvents.filter((e) => (e.data as unknown as NextDayRetentionData).returnedWithin24h).length;
  const returnRate = retentionEvents.length ? returnedCount / retentionEvents.length : 0;

  return {
    totalEvents: events.length,
    sessionCount: sessions.size,
    ttfi: { avg: ttfiAvg, min: ttfiMin, max: ttfiMax, count: ttfiEvents.length },
    reviewComplete: { passRate, total: reviewEvents.length },
    decomposeUse: { total: decomposeEvents.length, avgParts },
    nextDayRetention: { returnRate, total: retentionEvents.length },
  };
}

export function checkRetention(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LAST_SESSION_KEY);
    const now = Date.now();
    if (raw) {
      const lastTime = parseInt(raw, 10);
      const gap = now - lastTime;
      const within24h = gap < 24 * 60 * 60 * 1000;
      track("next_day_retention", { returnedWithin24h: within24h, lastSessionGap: gap });
    }
    localStorage.setItem(LAST_SESSION_KEY, String(now));
  } catch {
    // ignore
  }
}
