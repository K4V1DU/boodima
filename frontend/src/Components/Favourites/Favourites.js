import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHeart, FaRegHeart, FaMapMarkerAlt, FaUtensils, FaBed,
  FaMotorcycle, FaShoppingBag, FaExclamationCircle,
} from "react-icons/fa";
import "./Favourites.css";
import StudentNavbar from "../NavBar/Student_NavBar/StudentNavbar";
import Footer from "../NavBar/Footer/Footer";

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_BASE_URL;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─── Availability check ───────────────────────────────────────────────────
function isAvailable(item) {
  if (item?.isAvailable !== true) return false;
  if (!item?.expireDate) return false;
  if (new Date(item.expireDate) < new Date()) return false;
  return true;
}

// ─── Time helper ──────────────────────────────────────────────────────────
function isCurrentlyOpen(operatingHours) {
  try {
    const parse = (str) => {
      if (!str) return null;
      const [time, period] = str.trim().split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const now      = new Date();
    const nowMin   = now.getHours() * 60 + now.getMinutes();
    const openMin  = parse(operatingHours?.open);
    const closeMin = parse(operatingHours?.close);
    if (openMin === null || closeMin === null) return false;
    if (closeMin <= openMin) return nowMin >= openMin || nowMin < closeMin;
    return nowMin >= openMin && nowMin < closeMin;
  } catch { return false; }
}

// ─────────────────────────────────────────
// UNAVAILABLE MODAL
// ─────────────────────────────────────────
function UnavailableModal({ onClose }) {
  return (
    <div className="fav-modal-overlay" onClick={onClose}>
      <div className="fav-modal" onClick={e => e.stopPropagation()}>
        <div className="fav-modal__icon">
          <FaExclamationCircle />
        </div>
        <h3 className="fav-modal__title">Service Unavailable</h3>
        <p className="fav-modal__msg">
          This listing is currently unavailable or has expired.
          It may have been removed or taken offline by the host.
        </p>
        <button className="fav-modal__btn" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="fav-card fav-card--skeleton">
      <div className="fav-skeleton-box" style={{ height: 170, borderRadius: 12 }} />
      <div className="fav-card__body">
        <div className="fav-skeleton-line" style={{ width: "65%", height: 14, marginBottom: 8 }} />
        <div className="fav-skeleton-line" style={{ width: "45%", height: 12, marginBottom: 8 }} />
        <div className="fav-skeleton-line" style={{ width: "80%", height: 12 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ACCOMMODATION CARD
// ─────────────────────────────────────────
function AccCard({ item, onNavigate, onRemove }) {
  const [imgSrc,   setImgSrc]   = useState(null);
  const [removing, setRemoving] = useState(false);
  const available = isAvailable(item);

  useEffect(() => {
    if (item.images?.length > 0) {
      fetch(`${API_BASE}/Photo/${item.images[0]}`)
        .then(r => r.blob())
        .then(blob => setImgSrc(URL.createObjectURL(blob)))
        .catch(() => {});
    }
  }, [item]);

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    await onRemove(item._id, "Accommodation");
    setRemoving(false);
  };

  return (
    <div
      className={`fav-card${!available ? " fav-card--unavailable" : ""}`}
      onClick={() => onNavigate(item._id, "Accommodation", available)}
    >
      <div className="fav-card__image-wrap">
        {imgSrc
          ? <img src={imgSrc} alt={item.title} className="fav-card__image"
              onError={() => setImgSrc(null)} />
          : <div className="fav-card__image-fallback"><FaBed /></div>}

        {!available && (
          <div className="fav-card__unavail-overlay">
            <FaExclamationCircle style={{ fontSize: 20, marginBottom: 6 }} />
            <span>Unavailable</span>
          </div>
        )}

        <span className="fav-card__type-badge fav-card__type-badge--acc">
          <FaBed /> Boarding
        </span>

        <button
          className="fav-card__remove"
          onClick={handleRemove}
          disabled={removing}
          title="Remove from favourites"
          style={{ opacity: removing ? 0.5 : 1 }}
        >
          <FaHeart style={{ fontSize: 14, color: removing ? "#ccc" : "var(--fav-orange)" }} />
        </button>
      </div>

      <div className="fav-card__body">
        <div className="fav-card__header">
          <h3 className="fav-card__title">{item.title}</h3>
          {item.ratingAverage > 0 && (
            <span className="fav-card__rating">★ {item.ratingAverage.toFixed(1)}</span>
          )}
        </div>
        <p className="fav-card__location">
          <FaMapMarkerAlt style={{ color: "var(--fav-orange)", fontSize: 11, flexShrink: 0 }} />
          {item.address}
        </p>
        <div className="fav-card__footer">
          <span className="fav-card__meta">
            {item.ratingCount > 0
              ? `${item.ratingCount} review${item.ratingCount !== 1 ? "s" : ""}`
              : "No reviews yet"}
          </span>
          <span className="fav-card__price">
            Rs {item.pricePerMonth?.toLocaleString()}
            <span className="fav-card__price-unit">/mo</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FOOD SERVICE CARD
// ─────────────────────────────────────────
function FoodCard({ item, onNavigate, onRemove }) {
  const [imgSrc,   setImgSrc]   = useState(null);
  const [removing, setRemoving] = useState(false);
  const available = isAvailable(item);
  const open      = isCurrentlyOpen(item.operatingHours);

  useEffect(() => {
    const id = item.iconImage ?? item.BackgroundImage;
    if (id) setImgSrc(`${API_BASE}/Photo/${id}`);
  }, [item]);

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    await onRemove(item._id, "FoodService");
    setRemoving(false);
  };

  return (
    <div
      className={`fav-card${!available ? " fav-card--unavailable" : ""}`}
      onClick={() => onNavigate(item._id, "FoodService", available)}
    >
      <div className="fav-card__image-wrap">
        {imgSrc
          ? <img src={imgSrc} alt={item.kitchenName} className="fav-card__image"
              onError={() => setImgSrc(null)} />
          : <div className="fav-card__image-fallback"><FaUtensils /></div>}

        {!available && (
          <div className="fav-card__unavail-overlay">
            <FaExclamationCircle style={{ fontSize: 20, marginBottom: 6 }} />
            <span>Unavailable</span>
          </div>
        )}

        <span className="fav-card__type-badge fav-card__type-badge--food">
          <FaUtensils /> Food
        </span>

        <button
          className="fav-card__remove"
          onClick={handleRemove}
          disabled={removing}
          title="Remove from favourites"
          style={{ opacity: removing ? 0.5 : 1 }}
        >
          <FaHeart style={{ fontSize: 14, color: removing ? "#ccc" : "var(--fav-orange)" }} />
        </button>

        {available && (
          <div className={`fav-card__status ${open ? "fav-card__status--open" : "fav-card__status--closed"}`}>
            <span className="fav-card__status-dot" />
            {open ? "Open" : "Closed"}
          </div>
        )}
      </div>

      <div className="fav-card__body">
        <div className="fav-card__header">
          <h3 className="fav-card__title">{item.kitchenName}</h3>
          {(item.ratingAverage ?? 0) > 0 && (
            <span className="fav-card__rating">★ {item.ratingAverage.toFixed(1)}</span>
          )}
        </div>
        <p className="fav-card__location">
          <FaMapMarkerAlt style={{ color: "var(--fav-orange)", fontSize: 11, flexShrink: 0 }} />
          {item.address}
        </p>
        <div className="fav-card__footer">
          <span className="fav-card__meta">
            {(item.ratingCount ?? 0) > 0
              ? `${item.ratingCount} review${item.ratingCount !== 1 ? "s" : ""}`
              : "No reviews yet"}
          </span>
          <div className="fav-card__tags">
            {item.deliveryAvailable && (
              <span className="fav-card__tag fav-card__tag--delivery">
                <FaMotorcycle style={{ fontSize: 9 }} /> Delivery
              </span>
            )}
            {item.pickupAvailable && (
              <span className="fav-card__tag fav-card__tag--pickup">
                <FaShoppingBag style={{ fontSize: 9 }} /> Pickup
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────
function EmptyState({ tab }) {
  const navigate = useNavigate();
  return (
    <div className="fav-empty">
      <div className="fav-empty__img-wrap">
        <img
          src={tab === "accommodations" ? "/Images/icon4.jpg" : "/Images/icon5.jpg"}
          alt={tab === "accommodations" ? "No boardings saved" : "No food services saved"}
          className="fav-empty__img"
        />
      </div>
      <p className="fav-empty__title">No favourites yet</p>
      <p className="fav-empty__sub">
        {tab === "accommodations"
          ? "Browse boardings and tap the heart to save them here."
          : "Browse food services and tap the heart to save them here."}
      </p>
      <button
        className="fav-empty__btn"
        onClick={() => navigate(tab === "accommodations" ? "/Boardings" : "/Foods")}
      >
        {tab === "accommodations" ? "Browse Boardings" : "Browse Foods"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function Favourites() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [tab,        setTab]        = useState("accommodations");
  const [accItems,   setAccItems]   = useState([]);
  const [foodItems,  setFoodItems]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);

  // ── Fetch both favourite lists ────────────────────────────────────────
  useEffect(() => {
    if (!userId) { navigate("/Login"); return; }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [accRes, foodRes] = await Promise.all([
          fetch(`${API_BASE}/favourite/${userId}?itemType=Accommodation`).then(r => r.json()),
          fetch(`${API_BASE}/favourite/${userId}?itemType=FoodService`).then(r => r.json()),
        ]);
        const accList  = unwrap(accRes);
        const foodList = unwrap(foodRes);
        setAccItems((Array.isArray(accList)  ? accList  : []).map(f => f.itemId).filter(Boolean));
        setFoodItems((Array.isArray(foodList) ? foodList : []).map(f => f.itemId).filter(Boolean));
      } catch {
        setAccItems([]);
        setFoodItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId]);

  // ── Tab switch with brief skeleton flash ──────────────────────────────
  const handleTabSwitch = (newTab) => {
    if (newTab === tab) return;
    setTabLoading(true);
    setTab(newTab);
    setTimeout(() => setTabLoading(false), 350);
  };

  // ── Navigate — block unavailable listings ─────────────────────────────
  const handleNavigate = (itemId, type, available) => {
    if (!available) { setShowUnavailable(true); return; }
    if (type === "Accommodation") navigate(`/details-Accommodation/${itemId}`);
    else navigate(`/FoodService/${itemId}`);
  };

  // ── Remove favourite ──────────────────────────────────────────────────
  const handleRemove = async (itemId, itemType) => {
    try {
      await fetch(`${API_BASE}/favourite`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user: userId, itemId, itemType }),
      });
      if (itemType === "Accommodation") {
        setAccItems(prev => prev.filter(i => i._id !== itemId));
      } else {
        setFoodItems(prev => prev.filter(i => i._id !== itemId));
      }
    } catch { /* silent */ }
  };

  const accCount     = accItems.length;
  const foodCount    = foodItems.length;
  const activeItems  = tab === "accommodations" ? accItems : foodItems;
  const showSkeleton = loading || tabLoading;

  return (
    <div className="fav-page">
      <StudentNavbar />

      {/* ── Header ── */}
      <div className="fav-header">
        <div className="fav-header__inner">
          <div className="fav-header__icon">
            <img src="/Images/icon1.jpg" alt="Favourites" className="fav-header__icon-img" />
          </div>
          <div>
            <h1 className="fav-header__title">My Favourites</h1>
            <p className="fav-header__sub">
              {accCount + foodCount} saved place{accCount + foodCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="fav-tabs">
        <button
          className={`fav-tab${tab === "accommodations" ? " fav-tab--active" : ""}`}
          onClick={() => handleTabSwitch("accommodations")}
        >
          <FaBed style={{ fontSize: 13 }} />
          Boardings
          {accCount > 0 && <span className="fav-tab__count">{accCount}</span>}
        </button>
        <button
          className={`fav-tab${tab === "foods" ? " fav-tab--active" : ""}`}
          onClick={() => handleTabSwitch("foods")}
        >
          <FaUtensils style={{ fontSize: 13 }} />
          Food Services
          {foodCount > 0 && <span className="fav-tab__count">{foodCount}</span>}
        </button>
      </div>

      {/* ── Grid ── */}
      <section className="fav-section">
        {showSkeleton ? (
          <div className="fav-grid">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : activeItems.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="fav-grid">
            {tab === "accommodations"
              ? accItems.map(item => (
                  <AccCard key={item._id} item={item}
                    onNavigate={handleNavigate} onRemove={handleRemove} />
                ))
              : foodItems.map(item => (
                  <FoodCard key={item._id} item={item}
                    onNavigate={handleNavigate} onRemove={handleRemove} />
                ))}
          </div>
        )}
      </section>

      <Footer />

      {showUnavailable && (
        <UnavailableModal onClose={() => setShowUnavailable(false)} />
      )}
    </div>
  );
}