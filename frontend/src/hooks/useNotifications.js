// hooks/useNotifications.js
import { useState, useEffect, useCallback, useRef } from "react";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const POLL_MS  = 30_000;

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const pollRef  = useRef(null);
  // Keep a ref to latest notifications so callbacks never use stale closure
  const notifsRef = useRef([]);

  // Keep ref in sync
  useEffect(() => { notifsRef.current = notifications; }, [notifications]);

  // ── Fetch full list ────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/Notification?userId=${userId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  // ── Poll: re-fetch full list (keeps everything in sync) ───────────────────
  const pollNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res  = await fetch(`${BASE_URL}/Notification?userId=${userId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(pollNotifications, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications, pollNotifications]);

  // Refresh on tab focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") pollNotifications();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pollNotifications]);

  // ── Mark one read ──────────────────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch(`${BASE_URL}/Notification/${id}/read`, { method: "PATCH" });
    } catch { /* silent */ }
  }, []);

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch(`${BASE_URL}/Notification/read-all?userId=${userId}`, { method: "PATCH" });
    } catch { /* silent */ }
  }, [userId]);

  // ── Delete one — uses ref so never stale ──────────────────────────────────
  const deleteOne = useCallback(async (id) => {
    // Check ref for current unread status (never stale)
    const wasUnread = notifsRef.current.find(n => n._id === id && !n.read);
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch(`${BASE_URL}/Notification/${id}`, { method: "DELETE" });
    } catch { /* silent */ }
  }, []); // no deps — uses ref instead

  // ── Clear all ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    if (!userId) return;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await fetch(`${BASE_URL}/Notification/clear-all?userId=${userId}`, { method: "DELETE" });
    } catch { /* silent */ }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteOne,
    clearAll,
  };
}