import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaTimes,
  FaMapMarkerAlt,
  FaStar, FaCreditCard,
  FaEdit, FaTrash,
  FaBed, FaUsers,
} from "react-icons/fa";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";
import { usePhotoCache, CachedImg, prefetchPhotos } from "../Image_Cache/usePhotoCache";
import "./HostListings.css";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// ─── Helper ───────────────────────────────────────────────────────────────────
const isListingLive = (item) => {
  const notExpired = !item.expireDate || new Date(item.expireDate) >= new Date();
  return item.isAvailable && notExpired;
};

// ─── ListingCard ──────────────────────────────────────────────────────────────
function ListingCard({ item, onClick }) {
  const { cachedUrl, photoStatus } = usePhotoCache();

  const coverPhotoId = item.images?.[0];
  const coverUrl     = cachedUrl(coverPhotoId);
  const status       = photoStatus(coverPhotoId);
  const imgLoading   = status === "loading";

  const isOpen      = isListingLive(item);
  const title       = item.title;
  const typeLabel   = item.accommodationType || "Accommodation";
  const rating      = item.ratingAverage ?? 0;
  const reviewCount = item.ratingCount ?? item.reviews?.length ?? 0;

  if (imgLoading) {
    return (
      <div className="lc lc--skeleton">
        <div className="lc__img-skeleton" />
        <div className="lc__body">
          <div className="lc__skel-line lc__skel-line--title" />
          <div className="lc__skel-line lc__skel-line--sub" />
          <div className="lc__skel-line lc__skel-line--meta" />
        </div>
      </div>
    );
  }

  return (
    <div className="lc" onClick={() => onClick(item)}>
      <div className="lc__img-wrap">
        {coverUrl
          ? <img src={coverUrl} alt={title} className="lc__img" />
          : <div className="lc__img-placeholder" />
        }
        <div className={`lc__status ${isOpen ? "lc__status--open" : "lc__status--closed"}`}>
          <span className="lc__status-dot" />
          {isOpen ? "Listed" : "Unlisted"}
        </div>
        <div className="lc__img-chips">
          {item.pricePerMonth && (
            <span className="lc__img-chip lc__img-chip--delivery">
              LKR {Number(item.pricePerMonth).toLocaleString()}/mo
            </span>
          )}
        </div>
      </div>

      <div className="lc__body">
        <div className="lc__title-row">
          <h3 className="lc__title">{title || "Untitled listing"}</h3>
          {rating > 0 && (
            <span className="lc__rating">
              <FaStar className="lc__star" /> {rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="lc__subtitle">
          {typeLabel}
          {item.address && <> · <span className="lc__addr">{item.address}</span></>}
        </p>
        <div className="lc__meta-row">
          <span className="lc__reviews">
            {reviewCount > 0
              ? `${reviewCount} review${reviewCount !== 1 ? "s" : ""}`
              : "No reviews yet"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── ListingPopup ─────────────────────────────────────────────────────────────
function ListingPopup({ item, onClose, onEdit, onDelete, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const { cachedUrl } = usePhotoCache();

  const coverUrl = cachedUrl(item.images?.[0]);

  const isAvailable = item.isAvailable;
  const isExpired   = item.expireDate && new Date(item.expireDate) < new Date();
  const isListed    = isAvailable && !isExpired;

  const title    = item.title;
  const subtitle = item.accommodationType || "Accommodation";

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(item._id, !isAvailable);
    setToggling(false);
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={e => e.stopPropagation()}>
        <div className="popup-cover">
          {coverUrl
            ? <img src={coverUrl} alt={title} className="popup-cover-img" />
            : <div className="popup-cover-placeholder">Accommodation</div>
          }
          <button className="popup-close" onClick={onClose}><FaTimes /></button>
          <div className={`popup-status-badge ${isListed ? "on" : "off"}`}>
            <span className="pill-dot" />
            {isListed ? "Listed" : isExpired ? "Expired" : "Unlisted"}
          </div>
        </div>

        <div className="popup-scroll">
          <div className="popup-body-top">
            <div>
              <p className="popup-subtitle">{subtitle}</p>
              <h2 className="popup-title">{title || "Untitled listing"}</h2>
            </div>
            {item.ratingAverage > 0 && (
              <div className="popup-rating">
                <FaStar className="popup-star" />
                <span>{item.ratingAverage.toFixed(1)}</span>
                {item.ratingCount > 0 && <span className="popup-review-count">({item.ratingCount})</span>}
              </div>
            )}
          </div>

          <div className="popup-details">
            {item.address && (
              <div className="popup-detail-row">
                <FaMapMarkerAlt className="popup-detail-icon" /><span>{item.address}</span>
              </div>
            )}
            {item.pricePerMonth && (
              <div className="popup-detail-row">
                <FaCreditCard className="popup-detail-icon" />
                <span>LKR {Number(item.pricePerMonth).toLocaleString()} / month</span>
              </div>
            )}
            {(item.bedrooms || item.bathrooms) && (
              <div className="popup-detail-row">
                <FaBed className="popup-detail-icon" />
                <span>
                  {[
                    item.bedrooms  && `${item.bedrooms} bedroom${item.bedrooms !== 1 ? "s" : ""}`,
                    item.bathrooms && `${item.bathrooms} bathroom${item.bathrooms !== 1 ? "s" : ""}`,
                  ].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
            {item.genderPreference && (
              <div className="popup-detail-row">
                <FaUsers className="popup-detail-icon" />
                <span style={{ textTransform: "capitalize" }}>{item.genderPreference}</span>
              </div>
            )}
          </div>

          <div className="popup-status-toggle-section">
            <div className="popup-status-toggle-label">
              <span className="toggle-label-text">Listing Status</span>
              <span className={`toggle-label-status ${isListed ? "active" : "inactive"}`}>
                {isListed ? "Active" : isExpired ? "Expired" : "Unlisted"}
              </span>
            </div>
            <div
              className={`toggle-switch-large ${isAvailable ? "on" : "off"} ${toggling ? "loading" : ""}`}
              onClick={!toggling ? handleToggle : undefined}
              title={isAvailable ? "Click to unlist" : "Click to activate"}
            >
              <span className="toggle-thumb-large" />
            </div>
          </div>

          <div className="popup-actions">
            <button className="popup-btn popup-btn--edit" onClick={() => onEdit(item._id)}>
              <FaEdit /> Edit Listing
            </button>
            <button className="popup-btn popup-btn--delete" onClick={() => onDelete(item._id)}>
              <FaTrash /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <img
          src="/Images/icon2.jpg"
          alt="Accommodation"
          className="empty-illustration__img"
        />
      </div>
      <h3>No accommodations yet</h3>
      <p>List your property to start hosting guests.</p>
      <button className="btn-add-empty" onClick={onAdd}>Create a listing</button>
    </div>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Remove listing?</h3>
        <p>This listing will be permanently deleted. This action can't be undone.</p>
        <div className="modal-actions">
          <button className="modal-cancel"  onClick={onCancel}>Keep listing</button>
          <button className="modal-confirm" onClick={onConfirm}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─── HostListings (main) ──────────────────────────────────────────────────────
export default function HostListings() {
  const navigate = useNavigate();

  const [accommodations, setAccommodations] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [selectedItem,   setSelectedItem]   = useState(null);

  useEffect(() => {
    const currentUserId = localStorage.getItem("CurrentUserId") ?? "";
    if (!currentUserId) { setLoading(false); return; }

    const CACHE_KEY_AC = `hl_ac_${currentUserId}`;

    // ── 1. Serve cached data instantly ────────────────────────────────────
    const cachedAc = sessionStorage.getItem(CACHE_KEY_AC);
    if (cachedAc) {
      setAccommodations(JSON.parse(cachedAc));
      setLoading(false);
    }

    // ── 2. Fetch fresh data ───────────────────────────────────────────────
    const run = async () => {
      if (!cachedAc) {
        setLoading(true);
        setError(null);
      }

      try {
        let mine = [];
        try {
          const res = await axios.get(`${BASE_URL}/accommodation?owner=${currentUserId}`);
          const data = res.data?.data || res.data || [];
          mine = Array.isArray(data)
            ? data.filter(i => !i.owner || String(i.owner) === String(currentUserId) || String(i.owner?._id) === String(currentUserId))
            : [];
        } catch {
          const res = await axios.get(`${BASE_URL}/accommodation`);
          const all = res.data?.data || res.data || [];
          mine = Array.isArray(all)
            ? all.filter(i => String(i.owner) === String(currentUserId) || String(i.owner?._id) === String(currentUserId))
            : [];
        }

        setAccommodations(mine);
        sessionStorage.setItem(CACHE_KEY_AC, JSON.stringify(mine));

        const photoIds = mine.flatMap(a => [a.images?.[0]]).filter(Boolean);
        if (photoIds.length) prefetchPhotos(photoIds);
      } catch (err) {
        if (!cachedAc) setError(err.message ?? "Connection error");
      }

      setLoading(false);
    };

    run();
  }, []);

  const handleEdit = (id) => {
    setSelectedItem(null);
    navigate(`/edit-Accommodation/${id}`);
  };

  const handleToggle = async (id, val) => {
    const currentUserId = localStorage.getItem("CurrentUserId") ?? "";
    try {
      await axios.put(`${BASE_URL}/accommodation/${id}`, { isAvailable: val });
      setAccommodations(p => {
        const updated = p.map(a => a._id === id ? { ...a, isAvailable: val } : a);
        sessionStorage.setItem(`hl_ac_${currentUserId}`, JSON.stringify(updated));
        return updated;
      });
      setSelectedItem(s => s && s._id === id ? { ...s, isAvailable: val } : s);
    } catch { alert("Failed to update status."); }
  };

  const handleDeleteRequest = (id) => {
    setSelectedItem(null);
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const currentUserId = localStorage.getItem("CurrentUserId") ?? "";
    try {
      await axios.delete(`${BASE_URL}/accommodation/${deleteTarget}`);
      setAccommodations(p => {
        const updated = p.filter(a => a._id !== deleteTarget);
        sessionStorage.setItem(`hl_ac_${currentUserId}`, JSON.stringify(updated));
        return updated;
      });
    } catch { alert("Failed to delete."); }
    finally  { setDeleteTarget(null); }
  };

  return (
    <div className="page">

      <HostNavbar activeHref="/Listings" />

      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-header-left">
            <h1 className="page-title">Your listings</h1>
            {!loading && !error && (
              <span className="listings-count">
                {accommodations.length} listing{accommodations.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button className="btn-create" onClick={() => navigate("/add-accommodation")}>
            Create listing
          </button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-cover" />
                <div className="skeleton-body">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line medium" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="hl-error">
            <img src="/Images/icon7.jpg" alt="Connection error" className="hl-error__img" />
            <div className="hl-error__title">Connection Error</div>
            <div className="hl-error__msg">Something went wrong. Please check your connection and try again.</div>
            <button className="hl-error__btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : accommodations.length === 0 ? (
          <EmptyState onAdd={() => navigate("/add-accommodation")} />
        ) : (
          <div className="grid">
            {accommodations.map(item => (
              <ListingCard
                key={item._id}
                item={item}
                onClick={(item) => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />

      {selectedItem && (
        <ListingPopup
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onToggle={handleToggle}
        />
      )}

      {deleteTarget && (
        <DeleteModal onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}

    </div>
  );
}