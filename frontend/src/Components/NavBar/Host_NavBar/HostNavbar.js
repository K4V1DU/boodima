import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars, FaUser,
  FaSignOutAlt, FaEnvelope, FaCreditCard,
  FaBell, FaChevronDown, FaChevronUp,
  FaCalendarCheck, FaClipboardList, FaHome, FaCompass,
} from "react-icons/fa";
import { useNotifications } from "../../../hooks/useNotifications";
import "./HostNavbar.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="hn-modal-overlay" onClick={onCancel}>
      <div className="hn-modal" onClick={e => e.stopPropagation()}>
        <h3>Logout</h3>
        <p>Are you sure you want to logout from your host account?</p>
        <div className="hn-modal__actions">
          <button className="hn-modal__cancel" onClick={onCancel}>Cancel</button>
          <button className="hn-modal__confirm" onClick={onConfirm}>Yes, Logout</button>
        </div>
      </div>
    </div>
  );
}

const NAV_TABS = [
  { label: "Bookings", href: "/HostBookings", icon: <FaCalendarCheck /> },
  { label: "Orders",   href: "/HostOrders",   icon: <FaClipboardList /> },
  { label: "Listings", href: "/Listings",     icon: <FaHome /> },
];

export default function HostNavbar({ activeHref = "" }) {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const {
    notifications,
    unreadCount,
    markRead,
    deleteOne: deleteNotification,
    clearAll,
  } = useNotifications(userId);

  const [currentUser,    setCurrentUser]    = useState(null);
  const [userAvatarSrc,  setUserAvatarSrc]  = useState(
    () => sessionStorage.getItem("hostAvatarDataUrl") || null
  );
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [showBell,       setShowBell]       = useState(false);
  const [showLogout,     setShowLogout]     = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);
  const bellRef     = useRef(null);
  const mobileRef   = useRef(null);
  const msgPollRef  = useRef(null);

  // ── Fetch user profile + avatar ───────────────────────────────────────────
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
          const storedId = sessionStorage.getItem("hostAvatarPhotoId");
          if (storedId !== photoId) sessionStorage.removeItem("hostAvatarDataUrl");
          sessionStorage.setItem("hostAvatarPhotoId", photoId);
          const stored = sessionStorage.getItem("hostAvatarDataUrl");
          if (stored) {
            setUserAvatarSrc(stored);
          } else {
            try {
              const res = await fetch(`${API_BASE}/Photo/${photoId}`);
              if (res.ok) {
                const blob   = await res.blob();
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result;
                  sessionStorage.setItem("hostAvatarDataUrl", dataUrl);
                  setUserAvatarSrc(dataUrl);
                };
                reader.readAsDataURL(blob);
              }
            } catch { /* silent */ }
          }
        }
      })
      .catch(() => {});
  }, [userId]);

  // ── Fetch unread message count + poll every 10s ───────────────────────────
  const fetchUnreadMessages = async () => {
    if (!userId) return;
    try {
      const res  = await fetch(`${API_BASE}/message/conversations/${userId}`);
      const raw  = await res.json();
      const list = raw?.data ?? raw?.result ?? raw;
      const total = Array.isArray(list)
        ? list.reduce((sum, conv) => sum + (conv.unreadCount?.[userId] ?? 0), 0)
        : 0;
      setUnreadMsgCount(total);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!userId) return;
    fetchUnreadMessages();
    msgPollRef.current = setInterval(fetchUnreadMessages, 10000);
    return () => clearInterval(msgPollRef.current);
  }, [userId]);

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
      if (bellRef.current && !bellRef.current.contains(e.target))
        setShowBell(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target))
        setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogoutConfirm = () => {
    localStorage.removeItem("CurrentUserId");
    sessionStorage.removeItem("hostAvatarDataUrl");
    sessionStorage.removeItem("hostAvatarPhotoId");
    navigate("/Login");
  };

  const currentPath = window.location.pathname;

  return (
    <>
      <nav className="hn-nav">

        {/* ── Left: Logo + Mobile chevron toggle ── */}
        <div className="hn-nav__logo-wrap">
          <a href="/Listings" className="hn-nav__logo">
            <img src="/Images/logo2.png" alt="Unisewana Logo"
              style={{ height: "32px", width: "auto", display: "block" }} />
          </a>

          {/* Mobile nav toggle — bare arrow only, no box */}
          <div className="hn-mobile-nav" ref={mobileRef}>
            <button
              className={`hn-mobile-toggle${mobileMenuOpen ? " hn-mobile-toggle--open" : ""}`}
              onClick={() => setMobileMenuOpen(p => !p)}
              aria-label="Navigation menu"
            >
              {mobileMenuOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {mobileMenuOpen && (
              <div className="hn-mobile-menu">
                <div className="hn-mobile-menu__label">Navigate</div>
                {NAV_TABS.map(({ label, href, icon }) => {
                  const active = href === activeHref || href === currentPath;
                  return (
                    <a
                      key={label}
                      href={href}
                      className={`hn-mobile-menu__item${active ? " hn-mobile-menu__item--active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {icon} {label}
                      {active && <span className="hn-mobile-menu__dot" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Centre: Desktop tabs ── */}
        <div className="hn-nav__center">
          {NAV_TABS.map(({ label, href }) => (
            <a key={label} href={href}
              className={`hn-nav__tab${href === activeHref ? " hn-nav__tab--active" : ""}`}>
              {label}
              {href === activeHref && <span className="hn-nav__tab-underline" />}
            </a>
          ))}
        </div>

        {/* ── Right: Switch link (desktop) + Bell + Hamburger dropdown ── */}
        <div className="hn-nav__right">

          {/* "Switch to exploring" — desktop only, moves to dropdown on mobile */}
          <a href="/Boardings" className="hn-switch-link">Switch to exploring</a>

          {/* Bell */}
          <div className="hn-bell-wrap" ref={bellRef}>
            <button className="hn-bell-btn"
              onClick={() => { setShowBell(p => !p); setShowDropdown(false); }}
              aria-label="Notifications">
              <FaBell className="hn-bell-icon" />
              {unreadCount > 0 && (
                <span className="hn-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>

            {showBell && (
              <div className="hn-bell-dropdown">
                <div className="hn-bell-dropdown__header">
                  <span className="hn-bell-dropdown__title">Notifications</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {unreadCount > 0 && (
                      <span className="hn-bell-dropdown__count">{unreadCount} new</span>
                    )}
                    {notifications.length > 0 && (
                      <button className="hn-bell-clear" onClick={clearAll}>Clear all</button>
                    )}
                  </div>
                </div>
                <div className="hn-bell-dropdown__divider" />
                {notifications.length === 0 ? (
                  <div className="hn-bell-empty">
                    <FaBell style={{ fontSize: 28, color: "#d1d5db", marginBottom: 8 }} />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <ul className="hn-bell-list">
                    {notifications.map((n) => (
                      <li key={n._id}
                        className={`hn-bell-item${!n.read ? " hn-bell-item--unread" : ""}`}
                        onClick={() => {
                          if (!n.read) markRead(n._id);
                          if (n.link) { setShowBell(false); navigate(n.link); }
                        }}>
                        <div className="hn-bell-item__dot" />
                        <div className="hn-bell-item__body">
                          <div className="hn-bell-item__title">{n.title}</div>
                          <div className="hn-bell-item__msg">{n.message}</div>
                          <div className="hn-bell-item__time">
                            {new Date(n.createdAt).toLocaleString("en-GB", {
                              day: "numeric", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <button className="hn-bell-item__del"
                          onClick={e => { e.stopPropagation(); deleteNotification(n._id); }}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Hamburger + avatar pill */}
          <div className="hn-dropdown" ref={dropdownRef}>
            <button className="hn-nav__menu-btn"
              onClick={() => { setShowDropdown(p => !p); setShowBell(false); }}>
              <FaBars className="hn-menu-icon" />
              {userAvatarSrc
                ? <img src={userAvatarSrc} alt="Profile" className="hn-user-avatar"
                    onError={() => setUserAvatarSrc(null)} />
                : <span className="hn-user-icon-wrap"><FaUser className="hn-user-icon" /></span>}
              {unreadMsgCount > 0 && <span className="hn-menu-msg-dot" />}
            </button>

            {showDropdown && (
              <div className="hn-dropdown__menu">
                {currentUser && (
                  <>
                    <div className="hn-dropdown__profile">
                      <div className="hn-dropdown__name">{currentUser.name ?? "Host"}</div>
                      <div className="hn-dropdown__email">{currentUser.email ?? ""}</div>
                    </div>
                    <div className="hn-dropdown__divider" />
                  </>
                )}

                <div className="hn-dropdown__item"
                  onClick={() => { setShowDropdown(false); navigate("/Host-Profile"); }}>
                  <FaUser style={{ opacity: 0.55 }} /> Profile
                </div>

                <div className="hn-dropdown__item"
                  onClick={() => { setShowDropdown(false); navigate("/PaymentHistory"); }}>
                  <FaCreditCard style={{ opacity: 0.55 }} /> Payments
                </div>

                <div className="hn-dropdown__item"
                  onClick={() => { setShowDropdown(false); navigate("/Messages"); }}>
                  <FaEnvelope style={{ opacity: 0.55 }} /> Messages
                  {unreadMsgCount > 0 && (
                    <span className="hn-dropdown-msg-badge">
                      {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
                    </span>
                  )}
                </div>

                {/* Switch to exploring — mobile only (hidden on desktop via CSS) */}
                <div className="hn-dropdown__item hn-dropdown__item--switch"
                  onClick={() => { setShowDropdown(false); navigate("/Boardings"); }}>
                  <FaCompass style={{ opacity: 0.55 }} /> Switch to exploring
                </div>

                <div className="hn-dropdown__divider" />

                <div className="hn-dropdown__item hn-dropdown__item--danger"
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