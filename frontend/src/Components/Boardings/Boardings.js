import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Boardings.css";
import {
  FaSearch,
  FaHeart, FaRegHeart, FaSlidersH, FaTimes,
  FaBed, FaWifi, FaSnowflake, FaParking, FaUtensils,
  FaShower, FaMale, FaFemale, FaUsers,
  FaStar, FaExclamationCircle, FaSignInAlt, FaMapMarkerAlt,
} from "react-icons/fa";
import axios from "axios";
import StudentNavbar from "../NavBar/Student_NavBar/StudentNavbar";
import Footer from "../NavBar/Footer/Footer";
import { usePhotoCache, prefetchPhotos } from "../Image_Cache/usePhotoCache";

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_BASE_URL;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─── Constants ────────────────────────────────────────────────────────────
const ROOM_TYPES     = ["Single", "Double", "Triple", "Shared"];
const AMENITIES      = ["WiFi", "AC", "Attached Bath", "Parking", "Meals Included"];
const GENDER_OPTIONS = ["Male", "Female", "Mixed"];
const RATING_OPTIONS = [0, 3, 3.5, 4, 4.5];

const ROOM_ICON = {
  Single: <FaBed />, Double: <FaBed />, Triple: <FaBed />, Shared: <FaUsers />,
};
const AMENITY_ICON = {
  WiFi: <FaWifi />, AC: <FaSnowflake />, "Attached Bath": <FaShower />,
  Parking: <FaParking />, "Meals Included": <FaUtensils />,
};
const GENDER_ICON = { Male: <FaMale />, Female: <FaFemale />, Mixed: <FaUsers /> };

const DEFAULT_FILTERS = {
  roomTypes: [], amenities: [], gender: [], minRating: 0, maxPrice: 0,
};
const countActive = (f) =>
  f.roomTypes.length + f.amenities.length + f.gender.length +
  (f.minRating > 0 ? 1 : 0) + (f.maxPrice > 0 ? 1 : 0);

// ─────────────────────────────────────────
// LOGIN REQUIRED MODAL
// ─────────────────────────────────────────
function LoginRequiredModal({ onClose, onLogin }) {
  return (
    <div className="bd-modal-overlay" onClick={onClose}>
      <div className="bd-modal" onClick={e => e.stopPropagation()}>
        <div className="bd-modal__icon bd-modal__icon--warn"><FaExclamationCircle /></div>
        <h3 className="bd-modal__title">Student Login Required</h3>
        <p className="bd-modal__msg">
          This feature is only available for student accounts.
          Please login as a student to continue.
        </p>
        <div className="bd-modal__actions">
          <button className="bd-modal__btn bd-modal__btn--cancel" onClick={onClose}>Close</button>
          <button className="bd-modal__btn bd-modal__btn--confirm" onClick={onLogin}>
            <FaSignInAlt /> Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// CARD SKELETON
// ─────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bd-card bd-card--skeleton">
      <div className="bd-card__image-wrapper bd-skeleton-box" />
      <div className="bd-card__content">
        <div className="bd-skeleton-line" style={{ width: "70%", height: 14, marginBottom: 6 }} />
        <div className="bd-skeleton-line" style={{ width: "50%", height: 12, marginBottom: 10 }} />
        <div className="bd-skeleton-line" style={{ width: "90%", height: 12 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// BOARDING CARD
// ─────────────────────────────────────────
function BoardingCard({ acc, onNavigate, isFavourited, onToggleFavourite }) {
  const { cachedUrl } = usePhotoCache();
  const [pending, setPending] = useState(false);

  const photoId = acc.images?.[0];
  const imgSrc  = cachedUrl(photoId);

  const handleHeart = async (e) => {
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    await onToggleFavourite(acc._id, isFavourited);
    setPending(false);
  };

  return (
    <div className="bd-card" onClick={() => onNavigate(acc._id)}>
      <div className="bd-card__image-wrapper">
        {imgSrc
          ? <img src={imgSrc} alt={acc.title} className="bd-card__image" />
          : photoId
            ? <div className="bd-card__image-fallback bd-skeleton-box" />
            : <div className="bd-card__image-fallback" />}
        <button
          className="bd-card__heart"
          onClick={handleHeart}
          disabled={pending}
          style={{ opacity: pending ? 0.6 : 1 }}
        >
          {isFavourited
            ? <FaHeart    style={{ color: "var(--orange)", fontSize: 15 }} />
            : <FaRegHeart style={{ color: "#333",          fontSize: 15 }} />}
        </button>
        {acc.bedrooms && (
          <div className="bd-card__badge">{acc.bedrooms} Bed{acc.bedrooms > 1 ? "s" : ""}</div>
        )}
      </div>
      <div className="bd-card__content">
        <div className="bd-card__header-row">
          <h3 className="bd-card__title">{acc.title}</h3>
          {acc.ratingAverage > 0 && (
            <span className="bd-card__rating">★ {acc.ratingAverage.toFixed(1)}</span>
          )}
        </div>
        <p className="bd-card__subtitle">
          <FaMapMarkerAlt style={{ color: "var(--orange)", fontSize: 12, flexShrink: 0 }} />
          {acc.address}
        </p>
        <div className="bd-card__footer">
          <span className="bd-card__review-count">
            {acc.ratingCount > 0
              ? `${acc.ratingCount} review${acc.ratingCount !== 1 ? "s" : ""}`
              : "No reviews yet"}
          </span>
          <span className="bd-card__price">
            Rs {acc.pricePerMonth?.toLocaleString()}
            <span className="bd-card__price-label">/month</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FILTER POPUP
// ─────────────────────────────────────────
function FilterPopup({ draft, setDraft, onApply, onClear, onClose }) {
  const toggle = (field, val) =>
    setDraft(f => ({
      ...f,
      [field]: f[field].includes(val)
        ? f[field].filter(v => v !== val)
        : [...f[field], val],
    }));

  const ChipRow = ({ field, items, iconMap }) => (
    <div className="bd-filter-chips">
      {items.map(item => (
        <button
          key={item}
          className={`bd-filter-chip${draft[field].includes(item) ? " bd-filter-chip--on" : ""}`}
          onClick={() => toggle(field, item)}
        >
          <span className="bd-filter-chip__icon">{iconMap?.[item]}</span>
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bd-filter-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bd-filter-popup">
        <div className="bd-filter-popup__header">
          <button className="bd-filter-popup__close" onClick={onClose}><FaTimes /></button>
          <span className="bd-filter-popup__title">Filters</span>
          <button className="bd-filter-popup__clear" onClick={onClear}>Clear all</button>
        </div>

        <div className="bd-filter-popup__body">
          <div className="bd-filter-section">
            <div className="bd-filter-section__title">Room Type</div>
            <ChipRow field="roomTypes" items={ROOM_TYPES} iconMap={ROOM_ICON} />
          </div>
          <div className="bd-filter-divider" />
          <div className="bd-filter-section">
            <div className="bd-filter-section__title">Amenities</div>
            <ChipRow field="amenities" items={AMENITIES} iconMap={AMENITY_ICON} />
          </div>
          <div className="bd-filter-divider" />
          <div className="bd-filter-section">
            <div className="bd-filter-section__title">Gender Policy</div>
            <ChipRow field="gender" items={GENDER_OPTIONS} iconMap={GENDER_ICON} />
          </div>
          <div className="bd-filter-divider" />
          <div className="bd-filter-section">
            <div className="bd-filter-section__title">Minimum Rating</div>
            <div className="bd-filter-chips">
              {RATING_OPTIONS.map(r => (
                <button
                  key={r}
                  className={`bd-filter-chip${draft.minRating === r ? " bd-filter-chip--on" : ""}`}
                  onClick={() => setDraft(f => ({ ...f, minRating: r }))}
                >
                  {r === 0 ? "Any" : <><span className="bd-filter-chip__icon"><FaStar /></span>{r}+</>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bd-filter-popup__footer">
          <button className="bd-filter-apply-btn" onClick={onApply}>
            <FaSearch style={{ fontSize: 13 }} /> Search
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
const Boarding = () => {
  const navigate = useNavigate();

  const [accommodations, setAccommodations] = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [searchInput,    setSearchInput]    = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [showFilter,     setShowFilter]     = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters,   setDraftFilters]   = useState(DEFAULT_FILTERS);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────
  const [currentUser,  setCurrentUser]  = useState(null);

  // ── Favourites — Set of favourited accommodation IDs ──────────────────
  const [favouriteIds, setFavouriteIds] = useState(new Set());

  const activeCount = countActive(appliedFilters);
  const userId      = localStorage.getItem("CurrentUserId");
  const userRole    = currentUser?.role ?? null;
  const isStudent   = userRole === "student";

  // ── Fetch current user ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(raw => setCurrentUser(unwrap(raw)))
      .catch(() => setCurrentUser(null));
  }, []);

  // ── Fetch existing favourites ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/favourite/${userId}?itemType=Accommodation`)
      .then(r => r.json())
      .then(raw => {
        const list = unwrap(raw);
        const ids  = (Array.isArray(list) ? list : []).map(f =>
          typeof f.itemId === "object" ? f.itemId._id : f.itemId
        );
        setFavouriteIds(new Set(ids));
      })
      .catch(() => {});
  }, [userId]);

  // ── Toggle favourite ──────────────────────────────────────────────────
  const handleToggleFavourite = async (accId, currentlyFavourited) => {
    if (!userId || !isStudent) {
      setShowLoginRequired(true);
      return;
    }

    const method = currentlyFavourited ? "DELETE" : "POST";

    try {
      await fetch(`${API_BASE}/favourite`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userId, itemId: accId, itemType: "Accommodation" }),
      });

      setFavouriteIds(prev => {
        const next = new Set(prev);
        currentlyFavourited ? next.delete(accId) : next.add(accId);
        return next;
      });
    } catch { /* silent */ }
  };

  // ── Fetch accommodations ──────────────────────────────────────────────
  useEffect(() => {
    const fetchAccommodations = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/accommodation`);
        if (res.data.success) {
          const now     = new Date();
          const accData = res.data.data.filter(acc => {
            if (acc.isAvailable !== true) return false;
            if (!acc.expireDate) return false;
            if (new Date(acc.expireDate) < now) return false;
            return true;
          });
          setAccommodations(accData);
          setFiltered(accData);

          // Pre-warm image cache for all cards
          const photoIds = accData.map(a => a.images?.[0]).filter(Boolean);
          if (photoIds.length) prefetchPhotos(photoIds);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAccommodations();
  }, []);

  // ── Filter logic ──────────────────────────────────────────────────────
  const runFilter = (f, q, base) => {
    let r = base;
    if (f.roomTypes.length)  r = r.filter(a => f.roomTypes.includes(a.roomType));
    if (f.amenities.length)  r = r.filter(a => f.amenities.every(am => a.amenities?.includes(am)));
    if (f.gender.length)     r = r.filter(a => f.gender.includes(a.genderPolicy));
    if (f.minRating > 0)     r = r.filter(a => (a.ratingAverage ?? 0) >= f.minRating);
    if (q.trim()) {
      const lq = q.toLowerCase();
      r = r.filter(a =>
        a.title?.toLowerCase().includes(lq) ||
        a.address?.toLowerCase().includes(lq) ||
        a.description?.toLowerCase().includes(lq)
      );
    }
    return r;
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSearch      = () => { setSearchQuery(searchInput); setFiltered(runFilter(appliedFilters, searchInput, accommodations)); };
  const handleKeyDown     = e  => { if (e.key === "Enter") handleSearch(); };
  const openFilter        = () => { setDraftFilters(appliedFilters); setShowFilter(true); };
  const handleFilterApply = () => {
    setAppliedFilters(draftFilters);
    setSearchQuery(searchInput);
    setShowFilter(false);
    setFiltered(runFilter(draftFilters, searchInput, accommodations));
  };
  const handleFilterClear = () => setDraftFilters(DEFAULT_FILTERS);
  const clearAllFilters   = () => {
    setAppliedFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setFiltered(runFilter(DEFAULT_FILTERS, searchQuery, accommodations));
  };

  const filterSummary = () => {
    const parts = [];
    if (appliedFilters.roomTypes.length)  parts.push(appliedFilters.roomTypes.join(", "));
    if (appliedFilters.amenities.length)  parts.push(appliedFilters.amenities.join(", "));
    if (appliedFilters.gender.length)     parts.push(appliedFilters.gender.join(", "));
    if (appliedFilters.minRating)         parts.push(`★ ${appliedFilters.minRating}+`);
    return parts.join(" · ");
  };

  return (
    <div className="bd-page">

      {/* ══ NAVBAR ══ */}
      <StudentNavbar activeTab="Boardings" />

      {/* ══ SEARCH + FILTER BAR ══ */}
      <div className="bd-search-container">
        <div className="bd-search-bar">
          <input
            className="bd-search-input"
            type="text"
            placeholder="Search for hostels, rooms, or apartments"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`bd-filter-btn${activeCount > 0 ? " bd-filter-btn--active" : ""}`}
            onClick={openFilter}
            title="Filters"
          >
            <FaSlidersH />
            {activeCount > 0 && <span className="bd-filter-btn__badge">{activeCount}</span>}
          </button>
          <button className="bd-search-btn" onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="bd-active-filters">
          <span className="bd-active-filters__label">Active filters:</span>
          <span className="bd-active-filters__summary">{filterSummary()}</span>
          <button className="bd-active-filters__clear" onClick={clearAllFilters}>
            <FaTimes style={{ fontSize: 10 }} /> Clear all
          </button>
        </div>
      )}

      {/* ══ LISTINGS ══ */}
      <section className="bd-section">
        <div className="bd-section__header">
          <h2 className="bd-section__title">Nearest on your Campus</h2>
          {!loading && (
            <span className="bd-section__count">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <div className="bd-error">
            <img src="/Images/icon6.jpg" alt="Connection error" className="bd-error__img" />
            <div className="bd-error__title">Connection Error</div>
            <div className="bd-error__msg">Something went wrong. Please check your connection and try again.</div>
            <button className="bd-error__btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        <div className="bd-grid">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : error
              ? null
              : filtered.length === 0
                ? (
                  <div className="bd-empty">
                    <div className="bd-empty__icon">
                      <img src="/Images/icon3.jpg" alt="No boardings" className="bd-empty__img" />
                    </div>
                    <div className="bd-empty__title">No boardings found</div>
                    <div className="bd-empty__sub">Try adjusting your search or filters</div>
                  </div>
                )
                : filtered.map(acc => (
                    <BoardingCard
                      key={acc._id}
                      acc={acc}
                      isFavourited={favouriteIds.has(acc._id)}
                      onToggleFavourite={handleToggleFavourite}
                      onNavigate={id => navigate(`/details-Accommodation/${id}`)}
                    />
                  ))}
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <Footer />

      {/* ══ FILTER POPUP ══ */}
      {showFilter && (
        <FilterPopup
          draft={draftFilters} setDraft={setDraftFilters}
          onApply={handleFilterApply} onClear={handleFilterClear}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* ══ LOGIN REQUIRED ══ */}
      {showLoginRequired && (
        <LoginRequiredModal
          onClose={() => setShowLoginRequired(false)}
          onLogin={() => { setShowLoginRequired(false); navigate("/Login"); }}
        />
      )}

    </div>
  );
};

export default Boarding;