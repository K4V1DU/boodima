import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaSpinner,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaPhone,
  FaClock,
  FaTimesCircle,
  FaSearch,
  FaBookmark,
  FaBoxOpen,
  FaCalendarAlt,
  FaBed,
  FaEnvelope,
  FaCommentAlt,
  FaFilter,
  FaChevronDown,
  FaArrowLeft,
  FaExclamationTriangle,
  FaUser,
  FaBuilding,
  FaTag,
} from "react-icons/fa";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";
import "./HostBooking.css";

const API_BASE    = process.env.REACT_APP_API_BASE_URL;
const BOOKING_API = `${API_BASE}/Booking`;
const ORANGE      = "#FF6B2B";
const FONT        = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ── Unwrap API response (same helper used in FoodService) ──
function unwrap(raw) {
  return raw?.data ?? raw?.result ?? raw;
}

async function sendNotification({ recipient, type, title, message, link, refId, refType }) {
  try {
    await fetch(`${API_BASE}/Notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, type, title, message, link, refId, refType }),
    });
  } catch { /* silent */ }
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS = {
  pending:   { bg: "#fff7ed", text: "#c2410c", dot: ORANGE,    border: "#fcd9c4", label: "Pending"   },
  confirmed: { bg: "#f7f7f7", text: "#1b1b1b", dot: "#1b1b1b", border: "#e2e2e2", label: "Confirmed" },
  completed: { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e", border: "#bbf7d0", label: "Completed" },
  rejected:  { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444", border: "#fecaca", label: "Rejected"  },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444", border: "#fecaca", label: "Cancelled" },
};

const FILTER_OPTIONS = [
  { value: "all",       label: "All Bookings" },
  { value: "pending",   label: "Pending"      },
  { value: "confirmed", label: "Confirmed"    },
  { value: "completed", label: "Completed"    },
  { value: "rejected",  label: "Rejected"     },
  { value: "cancelled", label: "Cancelled"    },
];

// ─────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────
function ConfirmModal({ action, onConfirm, onCancel, loading }) {
  const isConfirm  = action === "confirmed";
  const isComplete = action === "completed";
  const isReject   = action === "rejected";
  return (
    <div className="hb-overlay" onClick={!loading ? onCancel : undefined}>
      <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`hb-modal__icon-wrap hb-modal__icon-wrap--${isReject ? "danger" : "primary"}`}>
          {isReject ? <FaTimesCircle /> : <FaCheckCircle />}
        </div>
        <h3 className="hb-modal__title">
          {isConfirm ? "Confirm Booking" : isComplete ? "Mark as Completed" : "Reject Booking"}
        </h3>
        <p className="hb-modal__desc">
          {isConfirm
            ? "Confirm this booking? The student will be notified their visit is approved."
            : isComplete
            ? "Mark this booking as completed? This confirms the visit has taken place."
            : "Reject this booking? This action cannot be undone and the student will be notified."}
        </p>
        <div className="hb-modal__btns">
          <button className="hb-modal__btn hb-modal__btn--ghost" onClick={onCancel} disabled={loading}>Back</button>
          <button
            className={`hb-modal__btn hb-modal__btn--${isReject ? "danger" : isComplete ? "dark" : "primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <FaSpinner className="hb-spin" /> : isConfirm ? "Confirm" : isComplete ? "Mark Completed" : "Yes, Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span className="hb-badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span className="hb-badge__dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────
// STUDENT ICON
// ─────────────────────────────────────────
function StudentIcon({ booking, selected }) {
  const [failed, setFailed] = useState(false);
  const photoId = booking.student?.profileImage ?? null;
  const src     = photoId ? `${API_BASE}/Photo/${photoId}` : null;

  if (src && !failed) {
    return (
      <div className="hb-row__icon hb-row__icon--img">
        <img
          src={src}
          alt={booking.student?.name ?? "Student"}
          className="hb-row__icon-img"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const letter = booking.student?.name?.charAt(0)?.toUpperCase();
  return (
    <div className={`hb-row__icon hb-row__icon--letter${selected ? " hb-row__icon--letter-active" : ""}`}>
      {letter ? <span className="hb-row__icon-letter">{letter}</span> : <FaUser />}
    </div>
  );
}

// ─────────────────────────────────────────
// BOOKING ROW
// ─────────────────────────────────────────
function BookingRow({ booking, selected, onClick }) {
  const name = booking.student?.name ?? "Student";
  const s    = STATUS[booking.status] ?? STATUS.pending;
  return (
    <div
      className={`hb-row${selected ? " hb-row--active" : ""}`}
      style={{ borderLeftColor: selected ? ORANGE : s.dot }}
      onClick={onClick}
    >
      <StudentIcon booking={booking} selected={selected} />
      <div className="hb-row__body">
        <div className="hb-row__top">
          <span className="hb-row__name">{name}</span>
          <StatusBadge status={booking.status} />
        </div>
        <div className="hb-row__meta">
          <span><FaCalendarAlt style={{ fontSize: 9 }} /> {formatDate(booking.visitDate)}</span>
          <span className="hb-sep">·</span>
          <span>{booking.visitTime ?? "—"}</span>
          <span className="hb-sep">·</span>
          <span className="hb-row__time"><FaClock style={{ fontSize: 9 }} /> {timeAgo(booking.createdAt)}</span>
        </div>
        {booking.accommodation?.title && (
          <div className="hb-row__property">
            <FaBed style={{ fontSize: 9 }} /> {booking.accommodation.title}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ACCOMMODATION CARD
// ─────────────────────────────────────────
function AccommodationCard({ accommodation }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!accommodation) return null;

  const imgId = accommodation.images?.[0] ?? null;
  const src   = imgId ? `${API_BASE}/Photo/${imgId}` : null;

  return (
    <div className="hb-accom-card">
      <div className="hb-accom-card__img-wrap">
        {src && !imgFailed ? (
          <img
            src={src}
            alt={accommodation.title}
            className="hb-accom-card__img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="hb-accom-card__img-fallback">
            <FaHome />
          </div>
        )}
      </div>

      <div className="hb-accom-card__info">
        <div className="hb-accom-card__name">{accommodation.title ?? "—"}</div>
        <div className="hb-accom-card__meta">
          {accommodation.accommodationType && (
            <span className="hb-accom-card__tag">
              <FaBuilding style={{ fontSize: 9 }} /> {accommodation.accommodationType}
            </span>
          )}
          {accommodation.pricePerMonth && (
            <span className="hb-accom-card__tag hb-accom-card__tag--price">
              <FaTag style={{ fontSize: 9 }} /> LKR {Number(accommodation.pricePerMonth).toLocaleString()}/mo
            </span>
          )}
          {accommodation.distance && (
            <span className="hb-accom-card__tag">
              <FaMapMarkerAlt style={{ fontSize: 9 }} /> {accommodation.distance}
            </span>
          )}
        </div>
        {accommodation.address && (
          <div className="hb-accom-card__address">
            <FaMapMarkerAlt style={{ fontSize: 9, color: ORANGE, flexShrink: 0, marginTop: 1 }} />
            {accommodation.address}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// BOOKING DETAIL PANEL
// ─────────────────────────────────────────
function BookingDetail({ booking, onAction, actionLoading, onBack, isMobile, currentUserId, navigate }) {
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError,   setMsgError]   = useState(null);

  if (!booking) {
    return (
      <div className="hb-detail hb-detail--empty">
        <FaBookmark className="hb-detail__empty-icon" />
        <p className="hb-detail__empty-text">Select a booking to view details</p>
      </div>
    );
  }

  const student    = booking.student ?? {};
  const name       = student.name ?? "Student";
  const phone      = student.phone ?? null;
  const profileImg = student.profileImage ? `${API_BASE}/Photo/${student.profileImage}` : null;
  const busy       = actionLoading === booking._id;

  // ── Message student — mirrors FoodService.jsx pattern exactly ──
  const handleMessageStudent = async () => {
    const studentId = student._id ?? (typeof booking.student === "string" ? booking.student : null);
    if (!studentId || !currentUserId) {
      setMsgError("Cannot open chat — student info missing.");
      return;
    }
    setMsgLoading(true);
    setMsgError(null);
    try {
      const res = await fetch(`${API_BASE}/message/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUserId, receiverId: studentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw  = await res.json();
      // ── Same unwrap helper used in FoodService ──
      const conv = unwrap(raw);
      if (!conv?._id) throw new Error("No conversation ID returned");
      // ── Navigate with state, same as FoodService ──
      navigate("/Messages", { state: { openConversationId: conv._id } });
    } catch (err) {
      setMsgError("Failed to open chat. Please try again.");
      console.error("[HostBooking] message open failed:", err);
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div className="hb-detail">

      {isMobile && (
        <button className="hb-detail__back-btn" onClick={onBack}>
          <FaArrowLeft style={{ fontSize: 13 }} />
          <span>Back to Bookings</span>
        </button>
      )}

      {/* ── Booking ID bar — status badge on the right ── */}
      <div className="hb-detail__booking-id">
        <span className="hb-detail__booking-id__text">Booking ID&nbsp;&nbsp;{booking._id}</span>
        <StatusBadge status={booking.status} />
      </div>

      {/* ── Header ── */}
      <div className="hb-detail__header">

        {/* Student info + Message pill on far right */}
        <div className="hb-detail__header-row">
          <div className="hb-detail__customer">
            <div className="hb-detail__avatar">
              {profileImg ? (
                <img
                  src={profileImg}
                  alt={name}
                  className="hb-detail__avatar-img"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="hb-detail__customer-info">
              <div className="hb-detail__customer-name">{name}</div>
              {student.email && (
                <a href={`mailto:${student.email}`} className="hb-detail__email">
                  <FaEnvelope style={{ fontSize: 10 }} /> {student.email}
                </a>
              )}
              {phone ? (
                <a href={`tel:${phone}`} className="hb-detail__phone">
                  <FaPhone style={{ fontSize: 10 }} /> {phone}
                </a>
              ) : (
                <span className="hb-detail__no-phone">No phone number</span>
              )}
            </div>
          </div>

          {/* "Contact host"-style pill button */}
          <button
            className="hb-contact-btn"
            onClick={handleMessageStudent}
            disabled={msgLoading}
            title="Open chat with this student"
          >
            {msgLoading
              ? <FaSpinner className="hb-spin" style={{ fontSize: 13 }} />
              : <FaEnvelope style={{ fontSize: 13 }} />}
            <span>{msgLoading ? "Opening…" : "Message Student"}</span>
          </button>
        </div>

        {/* Inline error if the API call fails */}
        {msgError && (
          <div style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            fontSize: 12,
            color: "#b91c1c",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <FaExclamationTriangle style={{ fontSize: 11, flexShrink: 0 }} />
            {msgError}
          </div>
        )}

        <div className="hb-detail__header-divider" />

        <div className="hb-detail__header-meta">
          <span className="hb-header-meta__item">
            <FaBed style={{ fontSize: 11 }} />
            {booking.accommodation?.title ?? "Property"}
          </span>
          <span className="hb-sep">·</span>
          <span className="hb-header-meta__item">
            <FaClock style={{ fontSize: 10 }} />
            {timeAgo(booking.createdAt)}
          </span>
          <span className="hb-sep">·</span>
          <span className="hb-header-meta__item hb-header-meta__item--visit">
            <FaCalendarAlt style={{ fontSize: 11 }} />
            {formatDate(booking.visitDate)}
          </span>
        </div>
      </div>

      <div className="hb-detail__body">

        {/* ── Accommodation ── */}
        {booking.accommodation && (
          <div className="hb-detail__section">
            <div className="hb-detail__section-label">Accommodation</div>
            <AccommodationCard accommodation={booking.accommodation} />
          </div>
        )}

        {/* ── Visit Details ── */}
        <div className="hb-detail__section">
          <div className="hb-detail__section-label">Visit Details</div>
          <div className="hb-dates-grid">
            <div className="hb-date-card">
              <div className="hb-date-card__label">
                <FaCalendarAlt className="hb-date-card__icon" /> Visit Date
              </div>
              <div className="hb-date-card__value">{formatDate(booking.visitDate)}</div>
              <div className="hb-date-card__sub">Scheduled visit day</div>
            </div>
            <div className="hb-date-divider">
              <span className="hb-date-divider__line" />
              <span className="hb-date-divider__dot" />
              <span className="hb-date-divider__line" />
            </div>
            <div className="hb-date-card">
              <div className="hb-date-card__label">
                <FaClock className="hb-date-card__icon hb-date-card__icon--time" /> Visit Time
              </div>
              <div className="hb-date-card__value">{booking.visitTime ?? "—"}</div>
              <div className="hb-date-card__sub">Preferred arrival time</div>
            </div>
          </div>
        </div>

        {/* ── Message from student ── */}
        {booking.message && (
          <div className="hb-detail__section">
            <div className="hb-detail__section-label hb-detail__section-label--msg">
              <FaCommentAlt className="hb-msg-icon" /> Message from Student
            </div>
            <div className="hb-detail__notes">{booking.message}</div>
          </div>
        )}

        {/* ── Booking actions ── */}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <div className="hb-detail__actions">
            {booking.status === "pending" && (
              <>
                <button className="hb-action hb-action--primary" onClick={() => onAction(booking, "confirmed")} disabled={busy}>
                  {busy ? <FaSpinner className="hb-spin" /> : <FaCheckCircle />} Confirm Booking
                </button>
                <button className="hb-action hb-action--ghost" onClick={() => onAction(booking, "rejected")} disabled={busy}>
                  <FaTimesCircle /> Reject
                </button>
              </>
            )}
            {booking.status === "confirmed" && (
              <>
                <button className="hb-action hb-action--dark" onClick={() => onAction(booking, "completed")} disabled={busy}>
                  {busy ? <FaSpinner className="hb-spin" /> : <FaCheckCircle />} Mark Completed
                </button>
                <button className="hb-action hb-action--ghost" onClick={() => onAction(booking, "rejected")} disabled={busy}>
                  <FaTimesCircle /> Reject
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function HostBooking() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [bookings,        setBookings]        = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [confirmModal,    setConfirmModal]    = useState(null);
  const [actionLoading,   setActionLoading]   = useState(null);
  const [lastRefresh,     setLastRefresh]     = useState(Date.now());
  const [toast,           setToast]           = useState({ show: false, msg: "" });
  const [error,           setError]           = useState(null);

  const [mobilePanel, setMobilePanel] = useState("list");
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 1024);

  const toastRef  = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ show: false, msg: "" }), 2600);
  };

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (!userId) navigate("/Login"); }, []);

  useEffect(() => {
    if (!userId) return;
    setLoadingBookings(true);
    setError(null);
    fetch(`${BOOKING_API}/host/${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((raw) => {
        const arr    = Array.isArray(raw?.data) ? raw.data : [];
        const sorted = arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(sorted);
        setSelectedBooking((prev) =>
          prev ? (sorted.find((b) => b._id === prev._id) ?? sorted[0]) : sorted[0]
        );
      })
      .catch((err) => {
        if (err === 404) { setBookings([]); return; }
        setError("Failed to load bookings. Please try again.");
      })
      .finally(() => setLoadingBookings(false));
  }, [userId, lastRefresh]);

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    if (isMobile) setMobilePanel("detail");
  };

  const handleBack   = () => setMobilePanel("list");
  const handleAction = (booking, action) => setConfirmModal({ booking, action });

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { booking, action } = confirmModal;
    setActionLoading(booking._id);
    try {
      const res = await fetch(`${BOOKING_API}/${booking._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error();

      setBookings((prev) => prev.map((b) => (b._id === booking._id ? { ...b, status: action } : b)));
      setSelectedBooking((prev) => prev?._id === booking._id ? { ...prev, status: action } : prev);
      showToast(
        action === "confirmed"   ? "Booking confirmed."
        : action === "completed" ? "Booking marked as completed."
        : "Booking rejected."
      );

      const studentId = booking.student?._id ?? booking.student ?? null;
      const propName  = booking.accommodation?.title ?? "the property";
      const notifMap  = {
        confirmed: { title: "Booking Confirmed", message: `Your booking at ${propName} has been confirmed.` },
        completed: { title: "Visit Completed",   message: `Your visit to ${propName} has been marked as completed.` },
        rejected:  { title: "Booking Rejected",  message: `Your booking at ${propName} has been rejected by the host.` },
        cancelled: { title: "Booking Cancelled", message: `Your booking at ${propName} has been cancelled by the host.` },
      };
      const notif = notifMap[action];
      if (studentId && notif) {
        sendNotification({
          recipient: studentId, type: "booking_status",
          title: notif.title,   message: notif.message,
          link: "/StudentBookings", refId: booking._id, refType: "Booking",
        });
      }
    } catch {
      showToast("Failed to update booking. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (b.student?.name        ?? "").toLowerCase().includes(q) ||
      (b.accommodation?.title ?? "").toLowerCase().includes(q) ||
      (b.message              ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const activeFilterLabel = FILTER_OPTIONS.find((f) => f.value === statusFilter)?.label ?? "All Bookings";
  const isFiltered = statusFilter !== "all" || searchQuery;

  return (
    <div className="hb-page" style={{ fontFamily: FONT }}>
      <HostNavbar activeHref="/HostBooking" />

      <div className="hb-wrapper">
        <div className="hb-titlebar">
          <div className="hb-titlebar__left">
            <h1 className="hb-titlebar__title">Bookings</h1>
            <span className="hb-titlebar__count">
              {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="hb-split">

          {/* LEFT */}
          <div className={`hb-split__left${isMobile && mobilePanel === "detail" ? " hb-split__left--hidden" : ""}`}>

            <div className="hb-searchbar">
              <div className="hb-search-wrap">
                <FaSearch className="hb-search-wrap__icon" />
                <input
                  className="hb-search"
                  placeholder="Search guest, property or message…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="hb-search-clear" onClick={() => setSearchQuery("")}>
                    <FaTimesCircle />
                  </button>
                )}
              </div>

              <div className="hb-filter" ref={filterRef}>
                <button
                  className={`hb-filter__btn${statusFilter !== "all" ? " hb-filter__btn--active" : ""}`}
                  onClick={() => setFilterOpen((prev) => !prev)}
                >
                  <FaFilter style={{ fontSize: 11 }} />
                  <span className="hb-filter__label">{activeFilterLabel}</span>
                  <FaChevronDown className={`hb-filter__chevron${filterOpen ? " hb-filter__chevron--open" : ""}`} />
                </button>

                {filterOpen && (
                  <div className="hb-filter__dropdown">
                    {FILTER_OPTIONS.map((opt) => {
                      const count = opt.value === "all"
                        ? bookings.length
                        : bookings.filter((b) => b.status === opt.value).length;
                      const s = STATUS[opt.value];
                      return (
                        <button
                          key={opt.value}
                          className={`hb-filter__option${statusFilter === opt.value ? " hb-filter__option--active" : ""}`}
                          onClick={() => { setStatusFilter(opt.value); setFilterOpen(false); }}
                        >
                          <span className="hb-filter__option-left">
                            {s && <span className="hb-filter__dot" style={{ background: s.dot }} />}
                            {opt.label}
                          </span>
                          <span className={`hb-filter__count${statusFilter === opt.value ? " hb-filter__count--active" : ""}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {isFiltered && (
              <div className="hb-active-filters">
                {statusFilter !== "all" && (
                  <span className="hb-filter-pill">
                    {activeFilterLabel}
                    <button className="hb-filter-pill__remove" onClick={() => setStatusFilter("all")}><FaTimesCircle /></button>
                  </span>
                )}
                {searchQuery && (
                  <span className="hb-filter-pill">
                    "{searchQuery}"
                    <button className="hb-filter-pill__remove" onClick={() => setSearchQuery("")}><FaTimesCircle /></button>
                  </span>
                )}
                <button className="hb-filter-clear-all" onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}>
                  Clear all
                </button>
              </div>
            )}

            {error && (
              <div className="hb-error">
                <FaExclamationTriangle /> {error}
              </div>
            )}

            {loadingBookings && (
              <div className="hb-skeleton-list">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="hb-skeleton-row">
                    <div className="hb-skeleton hb-skeleton--icon" />
                    <div style={{ flex: 1 }}>
                      <div className="hb-skeleton hb-skeleton--line" style={{ width: "55%", marginBottom: 8 }} />
                      <div className="hb-skeleton hb-skeleton--line" style={{ width: "80%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingBookings && !error && filteredBookings.length === 0 && (
              <div className="hb-empty">
                <FaBoxOpen className="hb-empty__icon" />
                <div className="hb-empty__title">
                  {isFiltered ? "No matching bookings" : "No bookings yet"}
                </div>
                <div className="hb-empty__sub">
                  {isFiltered
                    ? "Try adjusting your search or filter"
                    : "Booking requests will appear here once students submit them"}
                </div>
                {isFiltered && (
                  <button className="hb-empty__clear" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {!loadingBookings && !error && filteredBookings.map((booking) => (
              <BookingRow
                key={booking._id}
                booking={booking}
                selected={selectedBooking?._id === booking._id}
                onClick={() => handleBookingClick(booking)}
              />
            ))}
          </div>

          {/* RIGHT */}
          <div className={`hb-split__right${isMobile && mobilePanel === "list" ? " hb-split__right--hidden" : ""}`}>
            <BookingDetail
              booking={selectedBooking}
              onAction={handleAction}
              actionLoading={actionLoading}
              onBack={handleBack}
              isMobile={isMobile}
              currentUserId={userId}
              navigate={navigate}
            />
          </div>

        </div>
      </div>

      <Footer />

      {confirmModal && (
        <ConfirmModal
          action={confirmModal.action}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal(null)}
          loading={actionLoading === confirmModal.booking._id}
        />
      )}

      <div className={`hb-toast${toast.show ? " hb-toast--visible" : ""}`}>{toast.msg}</div>
    </div>
  );
}