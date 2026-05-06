/**
 * usePhotoCache — session-level image cache for the Host app.
 *
 * Stores blob URLs keyed by photo ID so each image is fetched only once
 * per browser session. URLs are revoked when the window unloads to avoid
 * memory leaks.
 *
 * Usage:
 *   const { cachedUrl } = usePhotoCache();
 *   <img src={cachedUrl(photoId)} />
 *
 * Or for the <CachedImg> convenience component:
 *   <CachedImg photoId={item.iconImage} alt="icon" className="my-img" />
 */

import { useState, useEffect, useCallback } from "react";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Module-level cache — survives re-renders and component unmounts
// { [photoId]: { url: string, status: "loading"|"ready"|"error" } }
const _cache   = {};
const _pending = {}; // { [photoId]: Promise<string> }

// Revoke all blob URLs when the tab closes
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    Object.values(_cache).forEach(entry => {
      if (entry?.url?.startsWith("blob:")) URL.revokeObjectURL(entry.url);
    });
  });
}

/**
 * Fetch a photo and store it as a blob URL.
 * Returns the blob URL (or null on error).
 */
/**
 * getCachedUrl — synchronous, returns blob URL if already in cache, else null.
 * Use for initial state to avoid flicker on re-mount.
 */
export function getCachedUrl(photoId) {
  if (!photoId) return null;
  const id = String(photoId);
  return _cache[id]?.status === "ready" ? _cache[id].url : null;
}

export async function fetchPhoto(photoId) {
  if (!photoId) return null;
  const id = String(photoId);

  // Already cached
  if (_cache[id]?.status === "ready")  return _cache[id].url;
  if (_cache[id]?.status === "error")  return null;

  // Already in-flight — return the same promise so we don't double-fetch
  if (_pending[id]) return _pending[id];

  _cache[id] = { url: null, status: "loading" };

  _pending[id] = fetch(`${BASE_URL}/Photo/${id}`, { cache: "default" })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      _cache[id] = { url, status: "ready" };
      delete _pending[id];
      return url;
    })
    .catch(() => {
      _cache[id] = { url: null, status: "error" };
      delete _pending[id];
      return null;
    });

  return _pending[id];
}

/**
 * Hook — returns:
 *   cachedUrl(photoId)           → blob URL or null
 *   photoStatus(photoId)         → "idle" | "loading" | "ready" | "error"
 * Components re-render automatically once the image is ready.
 */
export function usePhotoCache() {
  const [, forceUpdate] = useState(0);

  const cachedUrl = useCallback((photoId) => {
    if (!photoId) return null;
    const id = String(photoId);
    if (_cache[id]?.status === "ready") return _cache[id].url;
    if (!_cache[id] && !_pending[id]) {
      fetchPhoto(id).then(() => forceUpdate(n => n + 1));
    } else if (_pending[id]) {
      _pending[id].then(() => forceUpdate(n => n + 1));
    }
    return null;
  }, []);

  // "idle"    — no photoId provided (item has no image)
  // "loading" — fetch in progress
  // "ready"   — blob URL available
  // "error"   — fetch failed
  const photoStatus = useCallback((photoId) => {
    if (!photoId) return "idle";
    const id = String(photoId);
    if (_cache[id]?.status === "ready")   return "ready";
    if (_cache[id]?.status === "error")   return "error";
    if (_pending[id] || _cache[id]?.status === "loading") return "loading";
    return "idle";
  }, []);

  return { cachedUrl, photoStatus };
}

/**
 * CachedImg — drop-in <img> replacement that uses the cache.
 *
 * Props:
 *   photoId   — the Mongo ObjectId string of the photo
 *   fallback  — JSX to show while loading or on error (default: null)
 *   alt, className, style, onClick — passed through to <img>
 */
export function CachedImg({ photoId, fallback = null, alt = "", className = "", style = {}, onClick }) {
  const { cachedUrl } = usePhotoCache();
  const url = cachedUrl(photoId);

  if (!url) return fallback;

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onError={e => { e.currentTarget.style.display = "none"; }}
    />
  );
}

/**
 * prefetchPhotos — call this after loading listings to warm the cache
 * before the user clicks anything.
 *
 * Example:
 *   prefetchPhotos([item.BackgroundImage, item.iconImage, ...item.images]);
 */
export function prefetchPhotos(ids = []) {
  ids.filter(Boolean).forEach(id => fetchPhoto(String(id)));
}