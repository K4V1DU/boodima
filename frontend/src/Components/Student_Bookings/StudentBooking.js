import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaSpinner,
  FaMapMarkerAlt,
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
  FaBuilding,
  FaTag,
  FaBan,
  FaExternalLinkAlt,
} from "react-icons/fa";
import StudentNavbar from "../NavBar/Student_NavBar/StudentNavbar";
import Footer from "../NavBar/Footer/Footer";
import "./StudentBooking.css";

const API_BASE    = process.env.REACT_APP_API_BASE_URL;
const BOOKING_API = `${API_BASE}/Booking`;
const ORANGE      = "#FF6B2B";
const FONT        = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
  return (
    <div className="sb-overlay" onClick={!loading ? onCancel : undefined}>
      <div className="sb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sb-modal__icon-wrap sb-modal__icon-wrap--danger">
          <FaBan />
        </div>
        <h3 className="sb-modal__title">
          Cancel Booking
        </h3>
        <p className="sb-modal__desc">
          Cancel this visit request? The host will be notified and this action cannot be undone.
        </p>
        <div className="sb-modal__btns">
          <button className="sb-modal__btn sb-modal__btn--ghost" onClick={onCancel} disabled={loading}>Back</button>
          <button className="sb-modal__btn sb-modal__btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? <FaSpinner className="sb-spin" /> : "Yes, Cancel"}
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
    <span className="sb-badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span className="sb-badge__dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────
// ACCOMMODATION ICON (left list)
// ─────────────────────────────────────────
function AccomIcon({ booking, selected }) {
  const [failed, setFailed] = useState(false);
  const imgId = booking.accommodation?.images?.[0] ?? null;
  const src   = imgId ? `${API_BASE}/Photo/${imgId}` : null;

  if (src && !failed) {
    return (
      <div className="sb-row__icon sb-row__icon--img">
        <img src={src} alt={booking.accommodation?.title ?? "Property"}
          className="sb-row__icon-img" onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className={`sb-row__icon sb-row__icon--letter${selected ? " sb-row__icon--letter-active" : ""}`}>
      <FaHome />
    </div>
  );
}

// ─────────────────────────────────────────
// BOOKING ROW
// ─────────────────────────────────────────
function BookingRow({ booking, selected, onClick }) {
  const title = booking.accommodation?.title ?? "Property";
  const type  = booking.accommodation?.accommodationType ?? null;
  const s     = STATUS[booking.status] ?? STATUS.pending;
  return (
    <div className={`sb-row${selected ? " sb-row--active" : ""}`}
      style={{ borderLeftColor: selected ? ORANGE : s.dot }} onClick={onClick}>
      <AccomIcon booking={booking} selected={selected} />
      <div className="sb-row__body">
        <div className="sb-row__top">
          <span className="sb-row__name">{title}</span>
          <StatusBadge status={booking.status} />
        </div>
        <div className="sb-row__meta">
          {type && <span><FaBuilding style={{ fontSize: 9 }} /> {type}</span>}
          {type && <span className="sb-sep">·</span>}
          <span><FaCalendarAlt style={{ fontSize: 9 }} /> {formatDate(booking.visitDate)}</span>
          <span className="sb-sep">·</span>
          <span className="sb-row__time"><FaClock style={{ fontSize: 9 }} /> {timeAgo(booking.createdAt)}</span>
        </div>
        {booking.accommodation?.address && (
          <div className="sb-row__address">
            <FaMapMarkerAlt style={{ fontSize: 9 }} /> {booking.accommodation.address}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// HOST CARD
// ─────────────────────────────────────────
function HostCard({ accommodation }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!accommodation) return null;
  const owner   = accommodation.owner ?? {};
  const name    = owner.name ?? "Host";
  const email   = owner.email ?? null;
  const phone   = owner.phone ?? null;
  const photoId = owner.profileImage ?? null;
  const src     = photoId ? `${API_BASE}/Photo/${photoId}` : null;

  return (
    <div className="sb-host-card">
      <div className="sb-host-card__avatar">
        {src && !imgFailed ? (
          <img src={src} alt={name} className="sb-host-card__avatar-img"
            onError={() => setImgFailed(true)} />
        ) : name.charAt(0).toUpperCase()}
      </div>
      <div className="sb-host-card__info">
        <div className="sb-host-card__name">{name}</div>
        {email && (
          <a href={`mailto:${email}`} className="sb-host-card__email">
            <FaEnvelope style={{ fontSize: 10 }} /> {email}
          </a>
        )}
        {phone
          ? <a href={`tel:${phone}`} className="sb-host-card__phone"><FaPhone style={{ fontSize: 10 }} /> {phone}</a>
          : <span className="sb-host-card__no-phone">No phone number</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ACCOMMODATION SUMMARY CARD
// ─────────────────────────────────────────
function AccomCard({ accommodation }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!accommodation) return null;
  const imgId = accommodation.images?.[0] ?? null;
  const src   = imgId ? `${API_BASE}/Photo/${imgId}` : null;

  return (
    <div className="sb-accom-card">
      <div className="sb-accom-card__img-wrap">
        {src && !imgFailed ? (
          <img src={src} alt={accommodation.title} className="sb-accom-card__img"
            onError={() => setImgFailed(true)} />
        ) : (
          <div className="sb-accom-card__img-fallback"><FaHome /></div>
        )}
      </div>
      <div className="sb-accom-card__info">
        <div className="sb-accom-card__name">{accommodation.title ?? "—"}</div>
        <div className="sb-accom-card__meta">
          {accommodation.accommodationType && (
            <span className="sb-accom-card__tag">
              <FaBuilding style={{ fontSize: 9 }} /> {accommodation.accommodationType}
            </span>
          )}
          {accommodation.pricePerMonth && (
            <span className="sb-accom-card__tag sb-accom-card__tag--price">
              <FaTag style={{ fontSize: 9 }} /> LKR {Number(accommodation.pricePerMonth).toLocaleString()}/mo
            </span>
          )}
          {accommodation.distance && (
            <span className="sb-accom-card__tag">
              <FaMapMarkerAlt style={{ fontSize: 9 }} /> {accommodation.distance}
            </span>
          )}
        </div>
        {accommodation.address && (
          <div className="sb-accom-card__address">
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
      <div className="sb-detail sb-detail--empty">
        <FaBookmark className="sb-detail__empty-icon" />
        <p className="sb-detail__empty-text">Select a booking to view details</p>
      </div>
    );
  }

  const accommodation = booking.accommodation ?? {};
  const owner         = accommodation.owner ?? {};
  const title         = accommodation.title ?? "Property";
  const busy          = actionLoading === booking._id;
  const canCancel     = booking.status === "pending" || booking.status === "confirmed";

  // ── Resolve map coordinates (GeoJSON [lng, lat] or flat lat/lng fields) ──
  const coords   = accommodation.location?.coordinates;
  const lat      = coords ? coords[1] : (accommodation.latitude  ?? null);
  const lng      = coords ? coords[0] : (accommodation.longitude ?? null);
  const showMap  = !!(lat && lng);
  const mapSrc   = showMap ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed` : null;
  const mapsLink = showMap ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  // ── Message host ──
  const handleMessageHost = async () => {
    const hostId = owner._id ?? (typeof accommodation.owner === "string" ? accommodation.owner : null);
    if (!hostId || !currentUserId) { setMsgError("Cannot open chat — host info missing."); return; }
    setMsgLoading(true);
    setMsgError(null);
    try {
      const res = await fetch(`${API_BASE}/message/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUserId, receiverId: hostId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const conv = unwrap(await res.json());
      if (!conv?._id) throw new Error("No conversation ID returned");
      navigate("/Messages", { state: { openConversationId: conv._id } });
    } catch (err) {
      setMsgError("Failed to open chat. Please try again.");
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div className="sb-detail">

      {isMobile && (
        <button className="sb-detail__back-btn" onClick={onBack}>
          <FaArrowLeft style={{ fontSize: 13 }} /> <span>Back to Bookings</span>
        </button>
      )}

      {/* Booking ID bar */}
      <div className="sb-detail__booking-id">
        <span className="sb-detail__booking-id__text">Booking ID&nbsp;&nbsp;{booking._id}</span>
        <StatusBadge status={booking.status} />
      </div>

      {/* Header */}
      <div className="sb-detail__header">
        <div className="sb-detail__header-row">
          <HostCard accommodation={accommodation} />
          <button className="sb-contact-btn" onClick={handleMessageHost} disabled={msgLoading}
            title="Open chat with this host">
            {msgLoading ? <FaSpinner className="sb-spin" style={{ fontSize: 13 }} /> : <FaEnvelope style={{ fontSize: 13 }} />}
            <span>{msgLoading ? "Opening…" : "Message Host"}</span>
          </button>
        </div>

        {msgError && (
          <div className="sb-msg-error">
            <FaExclamationTriangle style={{ fontSize: 11, flexShrink: 0 }} /> {msgError}
          </div>
        )}

        <div className="sb-detail__header-divider" />

        <div className="sb-detail__header-meta">
          <span className="sb-header-meta__item"><FaBed style={{ fontSize: 11 }} /> {title}</span>
          <span className="sb-sep">·</span>
          <span className="sb-header-meta__item"><FaClock style={{ fontSize: 10 }} /> {timeAgo(booking.createdAt)}</span>
          <span className="sb-sep">·</span>
          <span className="sb-header-meta__item sb-header-meta__item--visit">
            <FaCalendarAlt style={{ fontSize: 11 }} /> {formatDate(booking.visitDate)}
          </span>
        </div>
      </div>

      <div className="sb-detail__body">

        {/* Property card */}
        {booking.accommodation && (
          <div className="sb-detail__section">
            <div className="sb-detail__section-label">Property</div>
            <AccomCard accommodation={accommodation} />
          </div>
        )}

        {/* Visit Details */}
        <div className="sb-detail__section">
          <div className="sb-detail__section-label">Visit Details</div>
          <div className="sb-dates-grid">
            <div className="sb-date-card">
              <div className="sb-date-card__label"><FaCalendarAlt className="sb-date-card__icon" /> Visit Date</div>
              <div className="sb-date-card__value">{formatDate(booking.visitDate)}</div>
              <div className="sb-date-card__sub">Scheduled visit day</div>
            </div>
            <div className="sb-date-divider">
              <span className="sb-date-divider__line" />
              <span className="sb-date-divider__dot" />
              <span className="sb-date-divider__line" />
            </div>
            <div className="sb-date-card">
              <div className="sb-date-card__label"><FaClock className="sb-date-card__icon sb-date-card__icon--time" /> Visit Time</div>
              <div className="sb-date-card__value">{booking.visitTime ?? "—"}</div>
              <div className="sb-date-card__sub">Preferred arrival time</div>
            </div>
          </div>
        </div>

        {/* My message */}
        {booking.message && (
          <div className="sb-detail__section">
            <div className="sb-detail__section-label sb-detail__section-label--msg">
              <FaCommentAlt className="sb-msg-icon" /> My Message
            </div>
            <div className="sb-detail__notes">{booking.message}</div>
          </div>
        )}

        {/* ── Property Location Map ── */}
        {showMap && (
          <div className="sb-detail__section sb-detail__section--map">
            <div className="sb-detail__section-label">Property Location</div>
            <div className="sb-map-wrap">
              <iframe
                className="sb-map-iframe"
                src={mapSrc}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Accommodation location"
              />
              <div className="sb-map-card">
                <FaMapMarkerAlt style={{ color: ORANGE, fontSize: 16, flexShrink: 0 }} />
                <div>
                  <div className="sb-map-card__name">{title}</div>
                  <div className="sb-map-card__sub">
                    {accommodation.address ?? `${lat?.toFixed(5)}, ${lng?.toFixed(5)}`}
                  </div>
                </div>
              </div>
            </div>
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="sb-map-link">
              <FaExternalLinkAlt style={{ fontSize: 11 }} />
              Get directions to property
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="sb-detail__actions">
          {canCancel && (
            <button className="sb-action sb-action--warning"
              onClick={() => onAction(booking, "cancelled")} disabled={busy}>
              {busy ? <FaSpinner className="sb-spin" /> : <FaBan />} Cancel Booking
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function StudentBooking() {
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
    fetch(`${BOOKING_API}/student/${userId}`)
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
  }, [userId]);

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
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error();
      setBookings((prev) => prev.map((b) => b._id === booking._id ? { ...b, status: "cancelled" } : b));
      setSelectedBooking((prev) => prev?._id === booking._id ? { ...prev, status: "cancelled" } : prev);
      showToast("Booking cancelled.");
      const hostId   = booking.accommodation?.owner?._id ?? booking.accommodation?.owner ?? null;
      const propName = booking.accommodation?.title ?? "the property";
      if (hostId) {
        sendNotification({
          recipient: hostId, type: "booking_status",
          title: "Booking Cancelled",
          message: `A student cancelled their booking request for ${propName}.`,
          link: "/HostBooking", refId: booking._id, refType: "Booking",
        });
      }
    } catch {
      showToast("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || (b.accommodation?.title   ?? "").toLowerCase().includes(q)
      || (b.accommodation?.address ?? "").toLowerCase().includes(q)
      || (b.message                ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const activeFilterLabel = FILTER_OPTIONS.find((f) => f.value === statusFilter)?.label ?? "All Bookings";
  const isFiltered = statusFilter !== "all" || searchQuery;

  return (
    <div className="sb-page" style={{ fontFamily: FONT }}>
      <StudentNavbar activeHref="/StudentBookings" />

      <div className="sb-wrapper">
        <div className="sb-titlebar">
          <div className="sb-titlebar__left">
            <h1 className="sb-titlebar__title">My Bookings</h1>
            <span className="sb-titlebar__count">
              {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="sb-split">
          {/* LEFT */}
          <div className={`sb-split__left${isMobile && mobilePanel === "detail" ? " sb-split__left--hidden" : ""}`}>
            <div className="sb-searchbar">
              <div className="sb-search-wrap">
                <FaSearch className="sb-search-wrap__icon" />
                <input className="sb-search" placeholder="Search property, address or message…"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && (
                  <button className="sb-search-clear" onClick={() => setSearchQuery("")}><FaTimesCircle /></button>
                )}
              </div>
              <div className="sb-filter" ref={filterRef}>
                <button className={`sb-filter__btn${statusFilter !== "all" ? " sb-filter__btn--active" : ""}`}
                  onClick={() => setFilterOpen((prev) => !prev)}>
                  <FaFilter style={{ fontSize: 11 }} />
                  <span className="sb-filter__label">{activeFilterLabel}</span>
                  <FaChevronDown className={`sb-filter__chevron${filterOpen ? " sb-filter__chevron--open" : ""}`} />
                </button>
                {filterOpen && (
                  <div className="sb-filter__dropdown">
                    {FILTER_OPTIONS.map((opt) => {
                      const count = opt.value === "all" ? bookings.length : bookings.filter((b) => b.status === opt.value).length;
                      const s = STATUS[opt.value];
                      return (
                        <button key={opt.value}
                          className={`sb-filter__option${statusFilter === opt.value ? " sb-filter__option--active" : ""}`}
                          onClick={() => { setStatusFilter(opt.value); setFilterOpen(false); }}>
                          <span className="sb-filter__option-left">
                            {s && <span className="sb-filter__dot" style={{ background: s.dot }} />}
                            {opt.label}
                          </span>
                          <span className={`sb-filter__count${statusFilter === opt.value ? " sb-filter__count--active" : ""}`}>
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
              <div className="sb-active-filters">
                {statusFilter !== "all" && (
                  <span className="sb-filter-pill">
                    {activeFilterLabel}
                    <button className="sb-filter-pill__remove" onClick={() => setStatusFilter("all")}><FaTimesCircle /></button>
                  </span>
                )}
                {searchQuery && (
                  <span className="sb-filter-pill">
                    "{searchQuery}"
                    <button className="sb-filter-pill__remove" onClick={() => setSearchQuery("")}><FaTimesCircle /></button>
                  </span>
                )}
                <button className="sb-filter-clear-all" onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}>
                  Clear all
                </button>
              </div>
            )}

            {error && <div className="sb-error"><FaExclamationTriangle /> {error}</div>}

            {loadingBookings && (
              <div className="sb-skeleton-list">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="sb-skeleton-row">
                    <div className="sb-skeleton sb-skeleton--icon" />
                    <div style={{ flex: 1 }}>
                      <div className="sb-skeleton sb-skeleton--line" style={{ width: "55%", marginBottom: 8 }} />
                      <div className="sb-skeleton sb-skeleton--line" style={{ width: "80%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingBookings && !error && filteredBookings.length === 0 && (
              <div className="sb-empty">
                <FaBoxOpen className="sb-empty__icon" />
                <div className="sb-empty__title">{isFiltered ? "No matching bookings" : "No bookings yet"}</div>
                <div className="sb-empty__sub">
                  {isFiltered ? "Try adjusting your search or filter" : "Your visit requests will appear here once you book a property"}
                </div>
                {isFiltered && (
                  <button className="sb-empty__clear" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {!loadingBookings && !error && filteredBookings.map((booking) => (
              <BookingRow key={booking._id} booking={booking}
                selected={selectedBooking?._id === booking._id}
                onClick={() => handleBookingClick(booking)} />
            ))}
          </div>

          {/* RIGHT */}
          <div className={`sb-split__right${isMobile && mobilePanel === "list" ? " sb-split__right--hidden" : ""}`}>
            <BookingDetail booking={selectedBooking} onAction={handleAction}
              actionLoading={actionLoading} onBack={handleBack}
              isMobile={isMobile} currentUserId={userId} navigate={navigate} />
          </div>
        </div>
      </div>

      <Footer />

      {confirmModal && (
        <ConfirmModal action={confirmModal.action} onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal(null)}
          loading={actionLoading === confirmModal.booking._id} />
      )}

      <div className={`sb-toast${toast.show ? " sb-toast--visible" : ""}`}>{toast.msg}</div>
    </div>
  );
}