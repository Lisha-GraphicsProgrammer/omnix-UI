import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../lib/api";

export interface NotificationIncident {
  id: number;
  timestamp: string;
  violation: string;
  zone: string;
  severity: string;
  alert_message: string;
  camera_id: number | null;
  screenshot_url?: string;
}

const LAST_SEEN_KEY = "omnix_notifications_last_seen_id";
const MUTED_KEY = "omnix_notifications_muted";
const POLL_INTERVAL_MS = 4000;
const PANEL_LIMIT = 15;

function getLastSeenId(): number {
  const raw = localStorage.getItem(LAST_SEEN_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

function setLastSeenId(id: number) {
  localStorage.setItem(LAST_SEEN_KEY, String(id));
}

function getMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === "true";
}

export function setNotificationsMuted(muted: boolean) {
  localStorage.setItem(MUTED_KEY, muted ? "true" : "false");
}

export function useNotifications() {
  const [incidents, setIncidents] = useState<NotificationIncident[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [muted, setMuted] = useState(getMuted());
  const knownMaxIdRef = useRef<number>(getLastSeenId());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const firstLoadRef = useRef(true);

  const playTone = useCallback(() => {
    if (muted) return;
    try {
      // Real Web Audio API beep — two quick short tones, no external audio file needed.
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const playBeep = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.2);
      };

      const now = ctx.currentTime;
      playBeep(now, 880);
      playBeep(now + 0.15, 1046.5);
    } catch {
      // Audio can fail before any user interaction on the page (autoplay policy) — safe to ignore.
    }
  }, [muted]);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/incidents?limit=${PANEL_LIMIT}&offset=0`);
      if (!res.ok) return;
      const data = await res.json();
      const items: NotificationIncident[] = data.items || [];
      setIncidents(items);

      if (items.length === 0) return;

      const currentMaxId = Math.max(...items.map((i) => i.id));
      const lastSeen = getLastSeenId();
      setUnreadCount(items.filter((i) => i.id > lastSeen).length);

      // Play a tone only for incidents that are genuinely new since the last poll,
      // not just "unread" — avoids blasting sound for a backlog on first load.
      if (!firstLoadRef.current && currentMaxId > knownMaxIdRef.current) {
        playTone();
      }
      firstLoadRef.current = false;
      knownMaxIdRef.current = Math.max(knownMaxIdRef.current, currentMaxId);
    } catch {
      // Network hiccup on a background poll — next tick will retry, no need to surface an error.
    }
  }, [playTone]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const markAllRead = useCallback(() => {
    setLastSeenId(knownMaxIdRef.current);
    setUnreadCount(0);
  }, []);

  const markOneRead = useCallback((id: number) => {
    if (id > getLastSeenId()) {
      setLastSeenId(id);
    }
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setNotificationsMuted(next);
      return next;
    });
  }, []);

  return { incidents, unreadCount, muted, toggleMuted, markAllRead, markOneRead };
}