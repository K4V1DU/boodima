import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars, FaUser, FaSignOutAlt, FaBell,
  FaShieldAlt, FaEnvelope,
} from "react-icons/fa";
import "../Admin_NavBar/AdminNavBar.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="an-modal-overlay" onClick={onCancel}>
      <div className="an-modal" onClick={e => e.stopPropagation()}>
        <h3>Logout</h3>
        <p>Are you sure you want to logout from the admin panel?</p>
        <div className="an-modal__actions">
          <button className="an-modal__cancel"  onClick={onCancel}>Cancel</button>
          <button className="an-modal__confirm" onClick={onConfirm}>Yes, Logout</button>
        </div>
      </div>
    </div>
  );
}

const NAV_TABS = [
  { label: "Dashboard", href: "/AdminDashboard" },
  { label: "Users",     href: "/AdminUsers"     },
  { label: "Listings",  href: "/AdminListings"  },
  { label: "Payments",  href: "/AdminPayments"  },
  { label: "Reviews",   href: "/AdminReviews"   },
];

export default function AdminNavBar({ activeHref = "" }) {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [currentUser,   setCurrentUser]   = useState(null);
  const [userAvatarSrc, setUserAvatarSrc] = useState(
    () => sessionStorage.getItem("adminAvatarDataUrl") || null
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBell,     setShowBell]     = useState(false);
  const [showLogout,   setShowLogout]   = useState(false);

  const dropdownRef = useRef(null);
  const bellRef     = useRef(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(async raw => {
        if (!raw) return;
        const user = unwrap(raw);
        setCurrentUser(user);
        if (user?.profileImage) {
          const photoId  = String(user.profileImage);
          const storedId = sessionStorage.getItem("adminAvatarPhotoId");
          if (storedId !== photoId) sessionStorage.removeItem("adminAvatarDataUrl");
          sessionStorage.setItem("adminAvatarPhotoId", photoId);
          const stored = sessionStorage.getItem("adminAvatarDataUrl");
          if (stored) { setUserAvatarSrc(stored); return; }
          try {
            const res = await fetch(`${API_BASE}/Photo/${photoId}`);
            if (res.ok) {
              const blob   = await res.blob();
              const reader = new FileReader();
              reader.onload = () => {
                sessionStorage.setItem("adminAvatarDataUrl", reader.result);
                setUserAvatarSrc(reader.result);
              };
              reader.readAsDataURL(blob);
            }
          } catch { /* silent */ }
        }
      }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (bellRef.current    && !bellRef.current.contains(e.target))      setShowBell(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogoutConfirm = () => {
    localStorage.removeItem("CurrentUserId");
    sessionStorage.removeItem("adminAvatarDataUrl");
    sessionStorage.removeItem("adminAvatarPhotoId");
    navigate("/Login");
  };

  return (
    <>
      <nav className="an-nav">
        {/* Logo */}
        <div className="an-nav__logo-wrap">
          <a href="/AdminDashboard" className="an-nav__logo">
            <img src="/Images/logo2.png" alt="Unisewana Logo"
              style={{ height: "32px", width: "auto", display: "block" }} />
            <span className="an-admin-badge">ADMIN</span>
          </a>
        </div>

        {/* Tabs */}
        <div className="an-nav__center">
          {NAV_TABS.map(({ label, href }) => (
            <span key={label}
              className={`an-nav__tab${href === activeHref ? " an-nav__tab--active" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => navigate(href)}
            >
              {label}
              {href === activeHref && <span className="an-nav__tab-underline" />}
            </span>
          ))}
        </div>

        {/* Right */}
        <div className="an-nav__right">
          {/* Bell */}
          <div className="an-bell-wrap" ref={bellRef}>
            <button className="an-bell-btn"
              onClick={() => { setShowBell(p => !p); setShowDropdown(false); }}
              aria-label="Notifications">
              <FaBell className="an-bell-icon" />
            </button>
            {showBell && (
              <div className="an-bell-dropdown">
                <div className="an-bell-dropdown__header">
                  <span className="an-bell-dropdown__title">Notifications</span>
                </div>
                <div className="an-bell-dropdown__divider" />
                <div className="an-bell-empty">
                  <FaBell style={{ fontSize: 28, color: "#d1d5db", marginBottom: 8 }} />
                  <p>No notifications yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger + avatar pill */}
          <div className="an-dropdown" ref={dropdownRef}>
            <button className="an-nav__menu-btn"
              onClick={() => { setShowDropdown(p => !p); setShowBell(false); }}>
              <FaBars className="an-menu-icon" />
              {userAvatarSrc
                ? <img src={userAvatarSrc} alt="Profile" className="an-user-avatar"
                    onError={() => setUserAvatarSrc(null)} />
                : <span className="an-user-icon-wrap"><FaShieldAlt className="an-user-icon" /></span>
              }
            </button>

            {showDropdown && (
              <div className="an-dropdown__menu">
                {currentUser && (
                  <>
                    <div className="an-dropdown__profile">
                      <div className="an-dropdown__name">{currentUser.name ?? "Admin"}</div>
                      <div className="an-dropdown__email">{currentUser.email ?? ""}</div>
                      <span className="an-dropdown__role">Admin</span>
                    </div>
                    <div className="an-dropdown__divider" />
                  </>
                )}
                {/* Profile */}
                <div className="an-dropdown__item"
                  onClick={() => { setShowDropdown(false); navigate("/AdminProfile"); }}>
                  <FaUser style={{ opacity: 0.55 }} /> Profile
                </div>
                {/* ✅ Messages added */}
                <div className="an-dropdown__item"
                  onClick={() => { setShowDropdown(false); navigate("/Messages"); }}>
                  <FaEnvelope style={{ opacity: 0.55 }} /> Messages
                </div>
                <div className="an-dropdown__divider" />
                <div className="an-dropdown__item an-dropdown__item--danger"
                  onClick={() => { setShowDropdown(false); setShowLogout(true); }}>
                  <FaSignOutAlt style={{ opacity: 0.65 }} /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showLogout && (
        <LogoutModal onConfirm={handleLogoutConfirm} onCancel={() => setShowLogout(false)} />
      )}
    </>
  );
}