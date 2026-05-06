import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./AccommodationDetails.css";
import {
  FaHeart, FaRegHeart, FaShare, FaUsers, FaBed, FaBath,
  FaEnvelope, FaWifi, FaSnowflake, FaFire, FaUtensils, FaTools,
  FaTv, FaTint, FaParking, FaMapMarkerAlt, FaCheck, FaSpinner,
  FaExclamationTriangle, FaCommentAlt, FaUserCircle, FaFlag,
  FaEllipsisH, FaSignInAlt, FaExclamationCircle, FaCalendarAlt,
  FaChevronLeft, FaChevronRight, FaPen, FaTrash, FaEdit, FaKey,
  FaCheckCircle, FaClock, FaTimesCircle, FaChevronUp,
} from "react-icons/fa";
import StudentNavbar from "../NavBar/Student_NavBar/StudentNavbar";
import Footer from "../NavBar/Footer/Footer";

// ── Shared components ──────────────────────────────────────────
import LoadingScreen from "../Overlays/LoadingScreen/Loader";
import { useToast } from "../Overlays/ToastMessages/ToastContext";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const ORANGE   = "#FF6B2B";
const FONT     = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const AVATAR_COLORS = ["#1a1a2e","#6a3093","#11998e","#c94b4b","#f7971e","#1d4350","#0f3460","#e94560","#533483","#2b5876"];
const STAR_HINTS    = ["","Poor","Fair","Good","Very Good","Excellent"];
const SHOW_MORE_THRESHOLD = 120;
const BLOCKING_BOOKING_STATUSES = new Set(["pending", "approved"]);

const normalizeBookingStatus = (status) => {
  if (status === "confirmed" || status === "accepted") return "approved";
  return status;
};

const AMENITY_ICONS = {
  wifi: FaWifi, "air conditioning": FaSnowflake, ac: FaSnowflake,
  heating: FaFire, kitchen: FaUtensils, "hair dryer": FaTools,
  iron: FaTools, tv: FaTv, washer: FaTint, parking: FaParking,
};
function amenityIcon(name = "") {
  const k = name.toLowerCase();
  for (const [key, Icon] of Object.entries(AMENITY_ICONS)) if (k.includes(key)) return Icon;
  return FaCheck;
}

// ── Image URL helpers ──────────────────────────────────────────
// Build a direct URL for a stored photo ID — no blob fetching needed
function photoUrl(id) {
  if (!id) return null;
  return `${API_BASE}/photo/${id}`;
}
function resolveImageSrc(img) {
  if (!img) return null;
  if (/^[a-f\d]{24}$/i.test(img)) return photoUrl(img);
  if (img.startsWith("http")) return img;
  return `${API_BASE}/photo/${img}`;
}

function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }
function calcStats(list) {
  if (!list.length) return { avg: 0, count: 0 };
  const sum = list.reduce((s, r) => s + (r.rating ?? 0), 0);
  return { avg: parseFloat((sum / list.length).toFixed(1)), count: list.length };
}
async function apiPost(path, body) {
  const r = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function apiPut(path, body) {
  const r = await fetch(`${API_BASE}${path}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function apiDelete(path) {
  const r = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function sendNotification({ recipient, type, title, message, link, refId, refType }) {
  if (!recipient) return;
  try {
    await fetch(`${API_BASE}/Notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, type, title, message, link, refId, refType }),
    });
  } catch {
    // Notification failure should not block booking flow
  }
}
async function populateAcc(acc) {
  if (acc.owner && typeof acc.owner === "string") {
    try {
      const r = await fetch(`${API_BASE}/User/${acc.owner}`);
      if (r.ok) acc.owner = unwrap(await r.json());
    } catch { acc.owner = null; }
  }
  if (Array.isArray(acc.reviews) && acc.reviews.length) {
    const settled = await Promise.allSettled(acc.reviews.map(async item => {
      if (item && typeof item === "object" && item.comment) {
        if (typeof item.reviewer === "string") {
          try {
            const rr = await fetch(`${API_BASE}/User/${item.reviewer}`);
            if (rr.ok) item.reviewer = unwrap(await rr.json());
          } catch {}
        }
        return item;
      }
      const rid = typeof item === "string" ? item : item?._id;
      if (!rid) return null;
      const rv = await fetch(`${API_BASE}/Review/${rid}`);
      if (!rv.ok) return null;
      const rev = unwrap(await rv.json());
      if (rev && typeof rev.reviewer === "string") {
        try {
          const rr = await fetch(`${API_BASE}/User/${rev.reviewer}`);
          if (rr.ok) rev.reviewer = unwrap(await rr.json());
        } catch {}
      }
      return rev;
    }));
    acc.reviews = settled.filter(r => r.status === "fulfilled" && r.value).map(r => r.value);
  }
  return acc;
}

/* ─── Modals ─────────────────────────────────────────────────── */
function Modal({ icon, iconClass, title, msg, children, onBg }) {
  return (
    <div className="acd-overlay" onClick={onBg}>
      <div className="acd-modal" onClick={e => e.stopPropagation()}>
        <div className={`acd-modal__icon ${iconClass}`}>{icon}</div>
        <h3 className="acd-modal__title">{title}</h3>
        {msg && <p className="acd-modal__msg">{msg}</p>}
        {children}
      </div>
    </div>
  );
}
function LoginModal({ onClose, onLogin }) {
  return (
    <Modal icon={<FaExclamationCircle />} iconClass="acd-modal__icon--warn" title="Student Login Required"
      msg="This feature is only available for student accounts. Please login as a student to continue." onBg={onClose}>
      <div className="acd-modal__actions">
        <button className="acd-mbtn acd-mbtn--cancel" onClick={onClose}>Close</button>
        <button className="acd-mbtn acd-mbtn--primary" onClick={onLogin}><FaSignInAlt /> Go to Login</button>
      </div>
    </Modal>
  );
}
function DeleteReviewModal({ onConfirm, onCancel, busy }) {
  return (
    <Modal icon={<FaTrash />} iconClass="acd-modal__icon--danger" title="Delete Review"
      msg="Are you sure you want to delete your review? This cannot be undone." onBg={onCancel}>
      <div className="acd-modal__actions">
        <button className="acd-mbtn acd-mbtn--cancel" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="acd-mbtn acd-mbtn--danger" onClick={onConfirm} disabled={busy}>
          {busy ? <><FaSpinner className="spin" /> Deleting…</> : "Yes, Delete"}
        </button>
      </div>
    </Modal>
  );
}
function BookingOKModal({ onClose }) {
  return (
    <Modal icon={<FaCheckCircle />} iconClass="acd-modal__icon--success" title="Visit Scheduled! 🎉"
      msg="Your visit request has been sent to the host. You'll be notified once they confirm." onBg={onClose}>
      <div className="acd-modal__actions">
        <button className="acd-mbtn acd-mbtn--primary" onClick={onClose}><FaCheck /> Got it!</button>
      </div>
    </Modal>
  );
}
function ValidationModal({ errors, onClose }) {
  return (
    <Modal icon={<FaExclamationTriangle />} iconClass="acd-modal__icon--warn" title="Please check your details" onBg={onClose}>
      <div className="acd-vlist">
        {errors.map((e, i) => (
          <div key={i} className="acd-vitem"><FaTimesCircle className="acd-vitem__icon" /><span>{e}</span></div>
        ))}
      </div>
      <div className="acd-modal__actions">
        <button className="acd-mbtn acd-mbtn--primary" onClick={onClose}>OK, Fix it</button>
      </div>
    </Modal>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────── */
function Skel({ w = "100%", h = 18, r = 8, mb = 0 }) {
  return <div style={{ width: w, height: h, borderRadius: r, marginBottom: mb, background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "acdSkel 1.4s ease infinite" }} />;
}

/* ─── Star Rater ─────────────────────────────────────────────── */
function StarRater({ value, onChange }) {
  const [hov, setHov] = useState(0);
  const d = hov || value;
  return (
    <div className="acd-starrater">
      <div className="acd-starrater__lbl">Your Rating</div>
      <div className="acd-starrater__row">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" className={`acd-starrater__star${d >= n ? " active" : ""}`}
            onMouseEnter={() => setHov(n)} onMouseLeave={() => setHov(0)} onClick={() => onChange(n)}>⭐</button>
        ))}
      </div>
      <div className="acd-starrater__hint">{d ? STAR_HINTS[d] : "Tap a star to rate"}</div>
    </div>
  );
}

/* ─── Review Modal ───────────────────────────────────────────── */
function ReviewModal({ onClose, onSubmit, busy, initialStars = 0, initialText = "", isEdit = false }) {
  const [stars, setStars] = useState(initialStars);
  const [text, setText]   = useState(initialText);
  const MAX = 400;
  const ok  = stars > 0 && text.trim().length >= 10 && !busy;
  return (
    <div className="acd-review-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="acd-review-modal">
        <div className="acd-review-modal__hdr">
          <div>
            <div className="acd-review-modal__title">{isEdit ? "Edit Your Review" : "Leave a Review"}</div>
            <div className="acd-review-modal__sub">{isEdit ? "Update your experience below" : "Share your experience with others"}</div>
          </div>
          <button className="acd-review-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="acd-review-modal__body">
          <StarRater value={stars} onChange={setStars} />
          <div className="acd-rfield">
            <div className="acd-rfield__lbl">Your Review</div>
            <textarea className="acd-rfield__ta"
              placeholder="Tell others about your experience — the room, host, facilities… (min 10 characters)"
              value={text} maxLength={MAX} onChange={e => setText(e.target.value)} style={{ fontFamily: FONT }} />
            <div className="acd-rfield__count">{text.length} / {MAX}</div>
          </div>
          <button className="acd-review-submit" disabled={!ok} onClick={() => onSubmit({ stars, text: text.trim() })} style={{ fontFamily: FONT }}>
            {busy
              ? <><FaSpinner className="spin" style={{ fontSize: 14 }} /> {isEdit ? "Saving…" : "Submitting…"}</>
              : <><FaPen style={{ fontSize: 13 }} /> {isEdit ? "Save Changes" : "Submit Review"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Review Card ────────────────────────────────────────────── */
function ReviewCard({ review, index, total, expanded, onToggle, isOwn, onEdit, onDelete }) {
  const rv    = review.reviewer;
  const name  = (typeof rv === "object" ? rv?.name : null) ?? "Guest";
  const joined = typeof rv === "object" && rv?.createdAt ? new Date(rv.createdAt).getFullYear() : null;
  const yrs   = joined ? new Date().getFullYear() - joined : 0;
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const date  = review.createdAt ? new Date(review.createdAt).toLocaleString("en-US", { month: "long", year: "numeric" }) : "Recent";
  const isLeft = index % 2 === 0;
  const hasBdr = index < total - 2;
  const isLong = (review.comment?.length ?? 0) > SHOW_MORE_THRESHOLD;
  const avSrc  = resolveImageSrc(typeof rv === "object" ? (rv?._profilePhotoUrl ?? rv?.profileImage ?? rv?.avatar) : null);
  return (
    <div className={`acd-rcard${hasBdr ? " acd-rcard--border" : ""}`}>
      <div className={isLeft ? "acd-rcard__inner acd-rcard__inner--left" : "acd-rcard__inner acd-rcard__inner--right"}>
        <div className="acd-rcard__author">
          <div className="acd-rcard__avatar" style={{ background: color }}>
            {avSrc
              ? <img src={avSrc} alt={name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                  onError={e => { e.currentTarget.style.display = "none"; }} />
              : name[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div className="acd-rcard__name">
              {name}
              {review.isNew && <span className="acd-badge acd-badge--green">New</span>}
              {isOwn && <span className="acd-badge acd-badge--blue">You</span>}
            </div>
            <div className="acd-rcard__yrs">{yrs > 0 ? `${yrs} year${yrs !== 1 ? "s" : ""} on Bodima` : "New member"}</div>
          </div>
          {isOwn && (
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
              <button className="acd-raction acd-raction--edit" onClick={onEdit}><FaEdit style={{ fontSize: 13 }} /></button>
              <button className="acd-raction acd-raction--del"  onClick={onDelete}><FaTrash style={{ fontSize: 12 }} /></button>
            </div>
          )}
        </div>
        <div className="acd-rcard__stars">
          <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
          <span style={{ color: "#ccc" }}>·</span>
          <span className="acd-rcard__date">{date}</span>
        </div>
        <div className={`acd-rcard__text${!expanded && isLong ? " acd-rcard__text--clamped" : ""}`}>{review.comment}</div>
        {isLong && <button className="acd-rcard__toggle" onClick={onToggle} style={{ fontFamily: FONT }}>{expanded ? "Show less" : "Show more"}</button>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const AccommodationDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  // ── Shared toast ──────────────────────────────────────────────
  const { toast } = useToast();

  const [acc,             setAcc]             = useState(null);
  const [images,          setImages]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [liveAvg,         setLiveAvg]         = useState(0);
  const [liveCount,       setLiveCount]       = useState(0);
  const [reviews,         setReviews]         = useState([]);
  const [currentUser,     setCurrentUser]     = useState(null);
  const [showLogin,       setShowLogin]       = useState(false);
  const [isSaved,         setIsSaved]         = useState(false);
  const [favPending,      setFavPending]      = useState(false);
  const [activeImg,       setActiveImg]       = useState(0);
  const [showMenu,        setShowMenu]        = useState(false);
  const [checkIn,         setCheckIn]         = useState("");
  const [checkTime,       setCheckTime]       = useState("");
  const [note,            setNote]            = useState("");
  const [expanded,        setExpanded]        = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllReviews,  setShowAllReviews]  = useState(false);
  const [reviewSaving,    setReviewSaving]    = useState(false);
  const [ownerUser,       setOwnerUser]       = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  const [bookingLoading,  setBookingLoading]  = useState(false);
  const [showBookingOK,   setShowBookingOK]   = useState(false);
  const [validErrors,     setValidErrors]     = useState([]);
  const [editingReview,   setEditingReview]   = useState(null);
  const [deletingId,      setDeletingId]      = useState(null);
  const [reviewActBusy,   setReviewActBusy]   = useState(false);
  const [showFloatBtn,    setShowFloatBtn]    = useState(true);

  const menuRef       = useRef(null);
  const bookingCardRef = useRef(null);

  const userId    = localStorage.getItem("CurrentUserId");
  const isLoggedIn = !!userId;
  const isStudent  = currentUser?.role === "student";
  const todayStr   = new Date().toISOString().split("T")[0];

  /* ── IntersectionObserver — hide float btn when booking card visible ── */
  useEffect(() => {
    if (!bookingCardRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { setShowFloatBtn(!entry.isIntersecting); },
      { threshold: 0.3 }
    );
    obs.observe(bookingCardRef.current);
    return () => obs.disconnect();
  }, []);

  const scrollToBooking = () => {
    bookingCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(raw => {
        const u = unwrap(raw);
        setCurrentUser(u);
        setReviews(prev => prev.map(r => {
          const rid = r.reviewer?._id ?? r.reviewer;
          if (String(rid) !== String(userId)) return r;
          const pu = u?.profileImage ? resolveImageSrc(u.profileImage) : null;
          return { ...r, reviewer: { ...(typeof r.reviewer === "object" ? r.reviewer : {}), _id: userId, name: u?.name ?? "Guest", createdAt: u?.createdAt, _profilePhotoUrl: pu } };
        }));
      })
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!userId || !id || !isStudent) return;
    fetch(`${API_BASE}/booking/student/${userId}`).then(r => r.json())
      .then(raw => {
        const list  = unwrap(raw) ?? [];
        const found = list.find(b => String(b.accommodation?._id ?? b.accommodation) === String(id));
        const normalizedStatus = normalizeBookingStatus(found?.status);
        if (found && BLOCKING_BOOKING_STATUSES.has(normalizedStatus)) {
          setExistingBooking({ _id: found._id, status: normalizedStatus });
        } else {
          setExistingBooking(null);
        }
      }).catch(() => {});
  }, [userId, id, isStudent]);

  useEffect(() => {
    if (!userId || !id) return;
    fetch(`${API_BASE}/favourite/check/${userId}/${id}/Accommodation`)
      .then(r => r.json())
      .then(raw => setIsSaved(raw?.isFavourited === true))
      .catch(() => {});
  }, [userId, id]);

  const handleToggleFav = async () => {
    if (!isLoggedIn || !isStudent) { setShowLogin(true); return; }
    if (favPending) return;
    setFavPending(true);
    try {
      await fetch(`${API_BASE}/favourite`, {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userId, itemId: id, itemType: "Accommodation" }),
      });
      setIsSaved(p => !p);
      toast(isSaved ? "Removed from favourites" : "Saved to favourites! ❤️", "success");
    } catch {
      toast("Failed to update favourites.", "error");
    } finally {
      setFavPending(false);
    }
  };

  // ── Load accommodation data ────────────────────────────────────
  // Images are now set as direct URLs — no blob fetching required
  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API_BASE}/Accommodation/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(async raw => {
        const data = unwrap(raw);
        await populateAcc(data);
        setAcc(data);
        setLiveAvg(data.ratingAverage ?? 0);
        setLiveCount(data.ratingCount ?? 0);

        const rl = (data.reviews ?? []).map(r => ({
          ...r,
          reviewer: {
            ...(typeof r.reviewer === "object" ? r.reviewer : {}),
            _id:       typeof r.reviewer === "object" ? r.reviewer?._id : r.reviewer,
            name:      typeof r.reviewer === "object" ? r.reviewer?.name : "Guest",
            createdAt: typeof r.reviewer === "object" ? r.reviewer?.createdAt : null,
          },
        }));
        const sorted = [...rl].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
        setReviews(sorted);
        if (sorted.length) {
          const { avg, count } = calcStats(sorted);
          setLiveAvg(avg);
          setLiveCount(count);
        }

        const ownerId = data.owner?._id ?? data.owner;
        if (ownerId && typeof data.owner === "string") {
          fetch(`${API_BASE}/User/${ownerId}`)
            .then(r => r.ok ? r.json() : null)
            .then(r2 => { if (r2) setOwnerUser(unwrap(r2)); })
            .catch(() => {});
        } else if (data.owner && typeof data.owner === "object") {
          setOwnerUser(data.owner);
        }

        // ── Direct URL approach — images render immediately ──────
        const imgUrls = (data.images ?? [])
          .filter(Boolean)
          .map(imgId => `${API_BASE}/photo/${imgId}`);
        setImages(imgUrls.length ? imgUrls : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const FALLBACK = "https://via.placeholder.com/800x500?text=No+Image";
  const imgs     = images.length ? images : [FALLBACK];
  const prevImg  = () => setActiveImg(p => (p - 1 + imgs.length) % imgs.length);
  const nextImg  = () => setActiveImg(p => (p + 1) % imgs.length);

  const handleReviewSubmit = async ({ stars, text }) => {
    setReviewSaving(true);
    try {
      const raw   = await apiPost("/review", { reviewer: userId, accommodation: id, rating: stars, comment: text });
      const saved = unwrap(raw);
      const pu    = currentUser?.profileImage ? resolveImageSrc(currentUser.profileImage) : null;
      const nr    = {
        ...saved,
        _id: saved._id ?? Date.now().toString(),
        reviewer: { _id: userId, name: currentUser?.name ?? "You", createdAt: currentUser?.createdAt, _profilePhotoUrl: pu },
        rating: stars, comment: text,
        createdAt: saved.createdAt ?? new Date().toISOString(),
        isNew: true,
      };
      setReviews(prev => {
        const u = [nr, ...prev];
        const { avg, count } = calcStats(u);
        setLiveAvg(avg); setLiveCount(count);
        return u;
      });
      setShowReviewModal(false);
      toast("Thanks for your review! ⭐", "success");
    } catch {
      toast("Failed to submit — please try again.", "error");
    } finally {
      setReviewSaving(false);
    }
  };

  const handleEditSubmit = async ({ stars, text }) => {
    if (!editingReview) return;
    setReviewActBusy(true);
    try {
      await apiPut(`/review/${editingReview._id}`, { rating: stars, comment: text });
      setReviews(prev => {
        const u = prev.map(r => r._id === editingReview._id ? { ...r, rating: stars, comment: text } : r);
        const { avg, count } = calcStats(u);
        setLiveAvg(avg); setLiveCount(count);
        return u;
      });
      setEditingReview(null);
      toast("Review updated. ✓", "success");
    } catch {
      toast("Failed to update.", "error");
    } finally {
      setReviewActBusy(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingId) return;
    setReviewActBusy(true);
    try {
      await apiDelete(`/review/${deletingId}`);
      setReviews(prev => {
        const u = prev.filter(r => r._id !== deletingId);
        const { avg, count } = calcStats(u);
        setLiveAvg(avg); setLiveCount(count);
        return u;
      });
      setDeletingId(null);
      toast("Review deleted.");
    } catch {
      toast("Failed to delete.", "error");
    } finally {
      setReviewActBusy(false);
    }
  };

  const validate = () => {
    const e = [];
    if (!checkIn) e.push("Please select a visit date.");
    else {
      const sel = new Date(checkIn + "T00:00:00"), tod = new Date();
      tod.setHours(0, 0, 0, 0);
      if (sel < tod) e.push("Visit date cannot be in the past.");
    }
    if (!checkTime) e.push("Please select a visit time.");
    else {
      const [h] = checkTime.split(":").map(Number);
      if (h < 7 || h >= 21) e.push("Visit time must be between 7:00 AM and 9:00 PM.");
      if (checkIn) {
        const now = new Date();
        const todayYmd = now.toISOString().split("T")[0];
        if (checkIn === todayYmd) {
          const [m] = checkTime.split(":").slice(1).map(Number);
          const selectedAt = new Date(now);
          selectedAt.setHours(h || 0, m || 0, 0, 0);
          if (selectedAt <= now) {
            e.push("For today, please select a future time.");
          }
        }
      }
    }
    return e;
  };

  const handleBookNow = async () => {
    if (!isLoggedIn || !isStudent) { setShowLogin(true); return; }
    const e = validate();
    if (e.length) { setValidErrors(e); return; }
    setBookingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: userId, accommodation: id, visitDate: checkIn, visitTime: checkTime, message: note.trim() || "" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? `Server error (${res.status})`);
      }
      const bk = unwrap(await res.json());
      const nextStatus = normalizeBookingStatus(bk.status ?? "pending");
      setExistingBooking(
        BLOCKING_BOOKING_STATUSES.has(nextStatus)
          ? { _id: bk._id, status: nextStatus }
          : null
      );
      setCheckIn(""); setCheckTime(""); setNote("");
      setShowBookingOK(true);

      const hostId = acc?.owner?._id ?? (typeof acc?.owner === "string" ? acc.owner : null);
      const listingTitle = acc?.title || "Accommodation";
      const visitText = `${checkIn}${checkTime ? ` at ${checkTime}` : ""}`;

      // Notify host about incoming booking request
      if (hostId) {
        sendNotification({
          recipient: hostId,
          type: "booking_request",
          title: "New Booking Request",
          message: `${currentUser?.name || "A student"} requested a visit for ${listingTitle}${visitText ? ` on ${visitText}` : ""}.`,
          link: "/HostBookings",
          refId: bk?._id,
          refType: "Booking",
        });
      }

      // Notify student that request is submitted
      sendNotification({
        recipient: userId,
        type: "booking_status",
        title: "Booking Request Sent",
        message: `Your booking request for ${listingTitle}${visitText ? ` on ${visitText}` : ""} was sent to the host.`,
        link: "/StudentBookings",
        refId: bk?._id,
        refType: "Booking",
      });
    } catch (err) {
      toast(`Booking failed: ${err.message ?? "Something went wrong."}`, "error");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!existingBooking?._id) return;
    const ok = window.confirm("Cancel this booking request?");
    if (!ok) return;

    setBookingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/booking/${existingBooking._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? `Server error (${res.status})`);
      }

      const hostId = acc?.owner?._id ?? (typeof acc?.owner === "string" ? acc.owner : null);
      const listingTitle = acc?.title || "Accommodation";

      // Notify host about cancellation
      if (hostId) {
        sendNotification({
          recipient: hostId,
          type: "booking_status",
          title: "Booking Cancelled",
          message: `${currentUser?.name || "A student"} cancelled the booking request for ${listingTitle}.`,
          link: "/HostBookings",
          refType: "Booking",
        });
      }

      // Notify student about successful cancellation
      sendNotification({
        recipient: userId,
        type: "booking_status",
        title: "Booking Cancelled",
        message: `Your booking request for ${listingTitle} has been cancelled.`,
        link: "/StudentBookings",
        refType: "Booking",
      });

      setExistingBooking(null);
      toast("Booking cancelled. You can book this listing again.", "success");
    } catch (err) {
      toast(`Failed to cancel booking: ${err.message ?? "Something went wrong."}`, "error");
    } finally {
      setBookingLoading(false);
    }
  };

  const openChat = async () => {
    if (!isLoggedIn || !isStudent) { setShowLogin(true); return; }
    const hostId = acc?.owner?._id ?? (typeof acc?.owner === "string" ? acc.owner : null);
    if (!hostId) { toast("Host info not available."); return; }
    try {
      toast("Opening chat…");
      const res  = await fetch(`${API_BASE}/message/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: userId, receiverId: hostId }),
      });
      const raw  = await res.json();
      const conv = raw?.data ?? raw?.result ?? raw;
      navigate("/Messages", { state: { openConversationId: conv._id } });
    } catch {
      toast("Failed to open chat. Try again.", "error");
    }
  };

  const renderBookBtn = () => {
    if (!acc) return null;
    const st = normalizeBookingStatus(existingBooking?.status);
    if (st === "approved") return (
      <>
        <button className="acd-bookbtn acd-bookbtn--green" onClick={openChat}><FaCommentAlt style={{ fontSize: 14 }} /> Message Now</button>
        <div className="acd-booknote acd-booknote--green"><FaCheckCircle /> Visit approved by host</div>
        <button className="acd-bookbtn acd-bookbtn--red" style={{ fontFamily: FONT }} onClick={handleCancelBooking} disabled={bookingLoading}>
          {bookingLoading ? <><FaSpinner className="spin" style={{ fontSize: 14 }} /> Cancelling…</> : <><FaTimesCircle style={{ fontSize: 14 }} /> Cancel Booking</>}
        </button>
      </>
    );
    if (st === "pending") return (
      <>
        <button className="acd-bookbtn acd-bookbtn--amber" disabled><FaClock style={{ fontSize: 14 }} /> Pending Approval</button>
        <div className="acd-booknote acd-booknote--amber"><FaClock /> Waiting for host to confirm</div>
        <button className="acd-bookbtn acd-bookbtn--red" style={{ fontFamily: FONT }} onClick={handleCancelBooking} disabled={bookingLoading}>
          {bookingLoading ? <><FaSpinner className="spin" style={{ fontSize: 14 }} /> Cancelling…</> : <><FaTimesCircle style={{ fontSize: 14 }} /> Cancel Booking</>}
        </button>
      </>
    );
    return (
      <>
        <button className="acd-bookbtn" style={{ fontFamily: FONT }} onClick={handleBookNow} disabled={bookingLoading}>
          {bookingLoading ? <><FaSpinner className="spin" style={{ fontSize: 14 }} /> Sending Request…</> : <>Book Now</>}
        </button>
        <p className="acd-booknote--sub">Fix Date for Visit</p>
      </>
    );
  };

  const rawOwner  = acc?.owner && typeof acc.owner === "object" ? acc.owner : ownerUser;
  const host      = rawOwner ? { ...rawOwner, joinedYear: rawOwner.createdAt ? new Date(rawOwner.createdAt).getFullYear() : null, isSuperhost: rawOwner.stats?.hostRating >= 4.8 ?? false, totalReviews: rawOwner.stats?.totalReviews ?? null } : null;
  const hostAvatar = host ? resolveImageSrc(host.profileImage ?? host.avatar) : null;
  const previewRevs = reviews.slice(0, 4);

  // ── LoadingScreen replaces inline skeleton for initial load ────
  if (loading) return <LoadingScreen />;

  if (error) return (
    <div style={{ fontFamily: FONT }}>
      <StudentNavbar activeTab="Boardings" />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Connection Error</div>
        <div style={{ fontSize: 14, color: "#757575", maxWidth: 300, lineHeight: 1.6 }}>Something went wrong. Please check your connection and try again.</div>
        <button onClick={() => window.location.reload()} style={{ padding: "10px 24px", background: ORANGE, color: "#fff", border: "none", borderRadius: 10, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>Retry</button>
      </div>
      <Footer />
    </div>
  );

  return (
    <div style={{ fontFamily: FONT, background: "#fff", color: "#1b1b1b", fontSize: 14, lineHeight: 1.5 }}>
      <StudentNavbar activeTab="Boardings" />

      <div className="acd-wrapper">

        {/* ── LISTING HEADER ── */}
        <div className="acd-lhdr">
          <div className="acd-lhdr__logo">
            {hostAvatar && hostAvatar !== FALLBACK
              ? <img src={hostAvatar} alt="icon" style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
              : "🏠"}
          </div>

          <div className="acd-lhdr__top-row">
            <div className="acd-lhdr__info">
              <>
                <h1 className="acd-lhdr__title">{acc?.title ?? "Listing"}</h1>
                <div className="acd-lhdr__meta">
                  <span style={{ fontWeight: 700, color: "#f59e0b" }}>⭐ {liveAvg.toFixed(1)}</span>
                  <span style={{ color: "#d1d5db" }}>•</span>
                  <span>({liveCount} ratings)</span>
                  {acc?.accommodationType && (
                    <><span style={{ color: "#d1d5db" }}>•</span><span>{acc.accommodationType}</span></>
                  )}
                </div>
                {acc?.address && (
                  <div className="acd-lhdr__addr">
                    <FaMapMarkerAlt style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }} />
                    <span>{acc.address}</span>
                  </div>
                )}
              </>
            </div>

            <div className="acd-lhdr__actions">
              <button
                className={`acd-iconbtn${isSaved ? " acd-iconbtn--saved" : ""}`}
                onClick={handleToggleFav}
                disabled={favPending}
                style={{ opacity: favPending ? .6 : 1 }}
              >
                {isSaved
                  ? <FaHeart style={{ color: ORANGE, fontSize: 16 }} />
                  : <FaRegHeart style={{ color: "#444", fontSize: 16 }} />}
              </button>
              <div ref={menuRef} style={{ position: "relative" }}>
                <button className="acd-iconbtn" onClick={() => setShowMenu(p => !p)}>
                  <FaEllipsisH style={{ color: "#444", fontSize: 15 }} />
                </button>
                {showMenu && (
                  <div className="acd-dropdown">
                    <div className="acd-dropdown__host">
                      <div className="acd-dropdown__ava">
                        {hostAvatar
                          ? <img src={hostAvatar} alt="host" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
                          : <FaUserCircle style={{ fontSize: 36, color: "#bbb" }} />}
                      </div>
                      <div>
                        <div className="acd-dropdown__hlbl">Hosted by</div>
                        <div className="acd-dropdown__hname">{host?.name ?? "Host"}</div>
                        <div className="acd-dropdown__hsince">{host?.joinedYear ? `Member since ${host.joinedYear}` : "Bodima Host"}</div>
                      </div>
                    </div>
                    <div className="acd-dropdown__div" />
                    <button className="acd-dropdown__item acd-dropdown__item--orange" onClick={async () => { setShowMenu(false); await openChat(); }}><FaCommentAlt style={{ fontSize: 13 }} /> Message Host</button>
                    <button className="acd-dropdown__item" onClick={() => setShowMenu(false)}><FaUserCircle style={{ fontSize: 14 }} /> View Host Profile</button>
                    <div className="acd-dropdown__div" />
                    <button className="acd-dropdown__item" onClick={() => { setShowMenu(false); navigator.clipboard?.writeText(window.location.href); toast("Link copied! 🔗", "success"); }}><FaShare style={{ fontSize: 13 }} /> Share this listing</button>
                    <button className="acd-dropdown__item acd-dropdown__item--red" onClick={() => { setShowMenu(false); if (!isLoggedIn) { setShowLogin(true); return; } toast("Report submitted. Thank you.", "success"); }}><FaFlag style={{ fontSize: 13 }} /> Report</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {acc && (
            <div className="acd-lhdr__below">
              {acc?.description && <div className="acd-lhdr__desc-text">{acc.description}</div>}
              <div className="acd-lhdr__badges">
                <span className={`acd-pill ${acc.isAvailable ? "acd-pill--green" : "acd-pill--red"}`}>
                  <span className={`acd-pill__dot ${acc.isAvailable ? "acd-pill__dot--green" : "acd-pill__dot--red"}`} />
                  {acc.isAvailable ? "Available" : "Not Available"}
                </span>
                {acc?.beds && <span className="acd-pill acd-pill--icon"><FaBed style={{ fontSize: 11 }} /> {acc.beds} bed{acc.beds !== 1 ? "s" : ""}</span>}
                {acc?.bedrooms && <span className="acd-pill acd-pill--icon"><FaBed style={{ fontSize: 11 }} /> {acc.bedrooms} bedroom{acc.bedrooms !== 1 ? "s" : ""}</span>}
                {acc?.bathrooms && <span className="acd-pill acd-pill--icon"><FaBath style={{ fontSize: 11 }} /> {acc.bathrooms} bath{acc.bathrooms !== 1 ? "s" : ""}</span>}
                {acc?.genderPreference && <span className="acd-pill acd-pill--icon"><FaUsers style={{ fontSize: 11 }} /> {acc.genderPreference}</span>}
                {acc?.keyMoneyDuration > 0 && <span className="acd-pill acd-pill--orange"><FaKey style={{ fontSize: 11 }} /> {acc.keyMoneyDuration} mo key money</span>}
                {acc?.distance && acc.distance !== "Distance not available" && <span className="acd-pill acd-pill--icon"><FaMapMarkerAlt style={{ fontSize: 11 }} /> {acc.distance}</span>}
              </div>
            </div>
          )}
        </div>
        {/* ── END LISTING HEADER ── */}

        <div className="acd-divider" />

        {/* BODY GRID */}
        <div className="acd-grid">
          {/* LEFT */}
          <main>
            {/* ── GALLERY ─────────────────────────────────────────────
                Mobile fix:
                - Main image is constrained with max-height + object-fit
                - Thumbnails use a horizontal scrollable strip with
                  flex-shrink:0 so they never cause layout overflow
            ─────────────────────────────────────────────────────── */}
            <div className="acd-gallery">
              {/* Main image */}
              <div className="acd-gallery__main" style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: 12 }}>
                <img
                  src={imgs[activeImg]}
                  alt="Accommodation"
                  className="acd-gallery__img"
                  style={{ width: "100%", height: "100%", maxHeight: 420, objectFit: "cover", display: "block" }}
                  onError={e => { e.currentTarget.src = FALLBACK; }}
                />
                {imgs.length > 1 && (
                  <>
                    <button className="acd-gallery__nav acd-gallery__nav--l" onClick={prevImg}><FaChevronLeft /></button>
                    <button className="acd-gallery__nav acd-gallery__nav--r" onClick={nextImg}><FaChevronRight /></button>
                  </>
                )}
                <div className="acd-gallery__count">{activeImg + 1} / {imgs.length}</div>
              </div>

              {/* Thumbnails — horizontal scrollable strip, no overflow on mobile */}
              {imgs.length > 1 && (
                <div
                  className="acd-gallery__thumbs"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 8,
                    overflowX: "auto",
                    overflowY: "hidden",
                    width: "100%",
                    paddingBottom: 4,           /* room for scrollbar */
                    boxSizing: "border-box",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "thin",
                  }}
                >
                  {imgs.slice(0, 5).map((src, i) => (
                    <div
                      key={i}
                      className={`acd-gallery__thumb${i === activeImg ? " active" : ""}`}
                      onClick={() => setActiveImg(i)}
                      style={{
                        flexShrink: 0,          /* prevent squishing */
                        width: 80,
                        height: 56,
                        borderRadius: 8,
                        overflow: "hidden",
                        cursor: "pointer",
                        border: i === activeImg ? `2px solid ${ORANGE}` : "2px solid transparent",
                        boxSizing: "border-box",
                      }}
                    >
                      <img
                        src={src}
                        alt={`thumb ${i + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={e => { e.currentTarget.src = FALLBACK; }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(acc?.amenities ?? []).length > 0 && (
              <section className="acd-section">
                <div className="acd-sec-title">What this place offers</div>
                <div className="acd-amenities">
                  {(acc?.amenities ?? []).map((a, i) => {
                    const lbl  = typeof a === "string" ? a : (a.name ?? String(a));
                    const Icon = amenityIcon(lbl);
                    return <div key={i} className="acd-amenity"><Icon className="acd-amenity__icon" /><span>{lbl}</span></div>;
                  })}
                </div>
              </section>
            )}

            {host && (
              <section className="acd-section">
                <div className="acd-sec-title">Hosted by</div>
                <div className="acd-hostcard">
                  <div className="acd-hostcard__ava-wrap">
                    {hostAvatar
                      ? <img src={hostAvatar} alt={host.name ?? "Host"} className="acd-hostcard__ava" onError={e => { e.currentTarget.style.display = "none"; }} />
                      : <div className="acd-hostcard__ava-ph">{(host.name ?? "H")[0].toUpperCase()}</div>}
                    {host.isSuperhost && <span className="acd-hostcard__badge">🏅</span>}
                  </div>
                  <div className="acd-hostcard__info">
                    <div className="acd-hostcard__name">{host.name}</div>
                    <div className="acd-hostcard__sub">{host.isSuperhost && <span style={{ color: ORANGE, fontWeight: 600 }}>Superhost · </span>}{host.joinedYear ? `Joined ${host.joinedYear}` : ""}</div>
                    {host.about && <div style={{ fontSize: 13, color: "#545454", marginTop: 4, lineHeight: 1.5 }}>{host.about}</div>}
                    {(host.totalReviews ?? liveCount) > 0 && <div style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>{host.totalReviews ?? liveCount} reviews</div>}
                    {host.phone && <div style={{ fontSize: 13, color: "#757575", marginTop: 2 }}>📞 {host.phone}</div>}
                    {host.isVerified && (
                      <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        {host.isVerified.email && <span className="acd-verified">✓ Email verified</span>}
                        {host.isVerified.phone && <span className="acd-verified">✓ Phone verified</span>}
                        {host.isVerified.id    && <span className="acd-verified">✓ ID verified</span>}
                      </div>
                    )}
                  </div>
                  <button className="acd-hostcard__btn" onClick={openChat}><FaEnvelope style={{ marginRight: 7, fontSize: 13 }} /> Contact host</button>
                </div>
              </section>
            )}

            {(acc?.rules ?? []).length > 0 && (
              <section className="acd-section">
                <div className="acd-sec-title">House Rules</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(acc.rules ?? []).map((rule, i) => (
                    <div key={i} className="acd-amenity"><FaCheck className="acd-amenity__icon" style={{ color: ORANGE }} /><span>{rule}</span></div>
                  ))}
                </div>
              </section>
            )}

            {acc?.utilityBills && (
              <section className="acd-section">
                <div className="acd-sec-title">Utility Bills</div>
                <div className="acd-amenities">
                  <div className="acd-amenity"><FaCheck className="acd-amenity__icon" style={{ color: acc.utilityBills.electricityIncluded ? "#16a34a" : "#dc2626" }} /><span>Electricity {acc.utilityBills.electricityIncluded ? "Included" : "Not included"}</span></div>
                  <div className="acd-amenity"><FaTint className="acd-amenity__icon" style={{ color: acc.utilityBills.waterIncluded ? "#16a34a" : "#dc2626" }} /><span>Water {acc.utilityBills.waterIncluded ? "Included" : "Not included"}</span></div>
                </div>
              </section>
            )}
          </main>

          {/* BOOKING SIDEBAR */}
          <aside className="acd-sidebar">
            <div className="acd-bcard" ref={bookingCardRef}>
              <div className="acd-bcard__price-row">
                {acc?.pricePerMonth
                  ? <><span className="acd-bcard__price">Rs {acc.pricePerMonth?.toLocaleString()}</span><span className="acd-bcard__per"> / month</span></>
                  : <span className="acd-bcard__price">Add dates for prices</span>}
              </div>
              <>
                <div className="acd-bcard__rating">
                  <span style={{ fontWeight: 700, fontSize: 14 }}>⭐ {liveAvg.toFixed(1)}</span>
                  <span style={{ color: "#757575", fontSize: 13 }}>({liveCount} reviews)</span>
                </div>

                {!existingBooking && (
                  <div className="acd-pickers">
                    <div className="acd-pickers__row">
                      <div className="acd-pickers__cell acd-pickers__cell--left">
                        <div className="acd-pickers__cell-label"><FaCalendarAlt style={{ fontSize: 9, marginRight: 3 }} />DATE</div>
                        <input type="date" className="acd-pickers__cell-input" value={checkIn} min={todayStr} onChange={e => setCheckIn(e.target.value)} />
                      </div>
                      <div className="acd-pickers__cell acd-pickers__cell--right">
                        <div className="acd-pickers__cell-label"><FaCalendarAlt style={{ fontSize: 9, marginRight: 3 }} />TIME</div>
                        <input type="time" className="acd-pickers__cell-input" value={checkTime} onChange={e => setCheckTime(e.target.value)} />
                      </div>
                    </div>
                    <div className="acd-pickers__note-wrap">
                      <div className="acd-pickers__note-label">Make a Note</div>
                      <input className="acd-pickers__note-input" placeholder="Ask something..." value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                  </div>
                )}

                {renderBookBtn()}

                {acc?.pricePerMonth && !existingBooking && (
                  <div className="acd-bcard__breakdown">
                    <div className="acd-bcard__brow"><span>Rs {acc.pricePerMonth?.toLocaleString()} × 1 month</span><span>Rs {acc.pricePerMonth?.toLocaleString()}</span></div>
                    {acc.keyMoneyDuration > 0 && <div className="acd-bcard__brow"><span>Key money ({acc.keyMoneyDuration} months)</span><span>Rs {(acc.pricePerMonth * acc.keyMoneyDuration).toLocaleString()}</span></div>}
                    <div className="acd-bcard__brow acd-bcard__brow--total"><span>Monthly Payment</span><span>Rs {acc.pricePerMonth?.toLocaleString()}</span></div>
                  </div>
                )}
              </>
            </div>

            {acc && (
              <div className="acd-infocard">
                {acc.genderPreference && <div className="acd-infocard__row"><FaUsers className="acd-infocard__icon" /><span>Gender: <strong style={{ textTransform: "capitalize" }}>{acc.genderPreference}</strong></span></div>}
                {acc.accommodationType && <div className="acd-infocard__row"><FaBed className="acd-infocard__icon" /><span>Type: <strong>{acc.accommodationType}</strong></span></div>}
                {acc.beds && <div className="acd-infocard__row"><FaBed className="acd-infocard__icon" /><span>Beds: <strong>{acc.beds}</strong></span></div>}
                {acc.keyMoneyDuration > 0 && <div className="acd-infocard__row"><FaKey className="acd-infocard__icon" /><span>Key money: <strong>{acc.keyMoneyDuration} months</strong></span></div>}
                {acc.address && <div className="acd-infocard__row"><FaMapMarkerAlt className="acd-infocard__icon" /><span>{acc.address}</span></div>}
                <div className="acd-infocard__row"><FaCheck className="acd-infocard__icon" style={{ color: acc.isAvailable ? "#16a34a" : "#dc2626" }} /><span style={{ color: acc.isAvailable ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{acc.isAvailable ? "Available" : "Not Available"}</span></div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* REVIEWS */}
      <section className="acd-revs">
        <div className="acd-wrapper">
          <div className="acd-revs__hdr">What guests are saying</div>
          <div className="acd-revs__rating-row">
            <span className="acd-revs__score">{liveAvg.toFixed(1)}</span>
            <div>
              <div style={{ fontSize: 18 }}>{"★".repeat(Math.round(liveAvg))}{"☆".repeat(5 - Math.round(liveAvg))}</div>
              <div style={{ fontSize: 14, color: "#757575" }}>{liveCount} ratings</div>
            </div>
          </div>
          <button className="acd-revs__write" style={{ fontFamily: FONT }}
            onClick={() => { if (!isLoggedIn || !isStudent) { setShowLogin(true); return; } setShowReviewModal(true); }}>
            <FaPen style={{ fontSize: 13 }} /> Write a Review
          </button>
          {reviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#757575", fontSize: 15 }}>No reviews yet — be the first to share your experience!</div>
          ) : (
            <div className="acd-revs__grid">
              {(showAllReviews ? reviews : previewRevs).map((r, i) => {
                const rid   = r.reviewer?._id ?? r.reviewer;
                const isOwn = isLoggedIn && String(userId) === String(rid);
                return (
                  <ReviewCard key={r._id ?? i} review={r} index={i}
                    total={showAllReviews ? reviews.length : previewRevs.length}
                    expanded={!!expanded[r._id ?? i]}
                    onToggle={() => setExpanded(e => ({ ...e, [r._id ?? i]: !e[r._id ?? i] }))}
                    isOwn={isOwn}
                    onEdit={() => setEditingReview(r)}
                    onDelete={() => setDeletingId(r._id)} />
                );
              })}
            </div>
          )}
          {reviews.length > 4 && (
            <button className="acd-revs__show-all" style={{ fontFamily: FONT }} onClick={() => setShowAllReviews(p => !p)}>
              {showAllReviews ? "Show less" : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </div>
      </section>

      {/* MAP */}
      {acc?.location?.coordinates && (
        <section className="acd-map">
          <div className="acd-wrapper">
            <div className="acd-map__title"><FaMapMarkerAlt style={{ color: ORANGE, marginRight: 6 }} /> Where you'll stay</div>
            <div className="acd-map__addr">{acc?.address}</div>
            {acc?.distance && acc.distance !== "Distance not available" && <div style={{ fontSize: 13, color: "#757575", marginBottom: 12 }}>📍 {acc.distance} from university</div>}
            <div className="acd-map__wrap">
              <iframe className="acd-map__iframe" src={`https://maps.google.com/maps?q=${acc.location.coordinates[1]},${acc.location.coordinates[0]}&z=16&output=embed`} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={acc?.title} />
              <div className="acd-map__card"><FaBed style={{ fontSize: 22, color: ORANGE }} /><div><div style={{ fontSize: 14, fontWeight: 700, color: "#000" }}>{acc?.title}</div><div style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>{acc?.address}</div></div></div>
            </div>
          </div>
        </section>
      )}

      <Footer />

      {/* ── FLOATING BOOK NOW BUTTON (mobile only) ── */}
      {acc && (
        <div className={`acd-float-book${showFloatBtn ? " acd-float-book--visible" : ""}`}>
          <div className="acd-float-book__inner">
            <div className="acd-float-book__price">
              {acc?.pricePerMonth
                ? <><strong>Rs {acc.pricePerMonth?.toLocaleString()}</strong><span> / mo</span></>
                : <span>View booking</span>}
            </div>
            <button className="acd-float-book__btn" style={{ fontFamily: FONT }} onClick={scrollToBooking}>
              <FaChevronUp style={{ fontSize: 13 }} /> Book Now
            </button>
          </div>
        </div>
      )}

      {showReviewModal  && <ReviewModal onClose={() => setShowReviewModal(false)} onSubmit={handleReviewSubmit} busy={reviewSaving} />}
      {editingReview    && <ReviewModal isEdit initialStars={editingReview.rating ?? 0} initialText={editingReview.comment ?? ""} onClose={() => setEditingReview(null)} onSubmit={handleEditSubmit} busy={reviewActBusy} />}
      {deletingId       && <DeleteReviewModal onConfirm={handleDeleteReview} onCancel={() => setDeletingId(null)} busy={reviewActBusy} />}
      {showLogin        && <LoginModal onClose={() => setShowLogin(false)} onLogin={() => { setShowLogin(false); navigate("/Login"); }} />}
      {showBookingOK    && <BookingOKModal onClose={() => setShowBookingOK(false)} />}
      {validErrors.length > 0 && <ValidationModal errors={validErrors} onClose={() => setValidErrors([])} />}

      <style>{`
        @keyframes acdSkel { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .spin { animation: spinAnim .8s linear infinite; display: inline-block }
        @keyframes spinAnim { to { transform: rotate(360deg) } }

        /* ── Mobile gallery fix ── */
        @media (max-width: 768px) {
          .acd-gallery {
            width: 100%;
            overflow: hidden;
          }
          .acd-gallery__main {
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: 10px;
            overflow: hidden;
          }
          .acd-gallery__main img {
            width: 100% !important;
            height: 100% !important;
            max-height: none !important;
            object-fit: cover;
            display: block;
          }
          .acd-gallery__thumbs {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            gap: 8px !important;
            width: 100% !important;
            padding-bottom: 4px !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            box-sizing: border-box;
          }
          .acd-gallery__thumb {
            flex-shrink: 0 !important;
            width: 72px !important;
            height: 50px !important;
            border-radius: 6px !important;
            overflow: hidden;
          }
          .acd-gallery__thumb img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block;
          }
        }
      `}</style>
    </div>
  );
};

export default AccommodationDetails;