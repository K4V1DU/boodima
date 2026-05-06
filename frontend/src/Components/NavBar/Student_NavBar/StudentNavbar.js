import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaUser,
  FaSignOutAlt,
  FaEnvelope,
  FaBell,
  FaReceipt,
  FaHeart,
  FaHome,
  FaUtensils,
  FaChevronDown,
  FaChevronUp,
  FaSignInAlt,
  FaLock,
  FaCalendarAlt,
} from "react-icons/fa";
import "./StudentNavbar.css";
import { useNotifications } from "../../../hooks/useNotifications";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="snav-overlay" onClick={onCancel}>
      <div className="snav-modal" onClick={(e) => e.stopPropagation()}>
        <div className="snav-modal__icon-wrap snav-modal__icon-wrap--danger">
          <FaSignOutAlt />
        </div>
        <h3 className="snav-modal__title">Logout</h3>
        <p className="snav-modal__desc">Are you sure you want to logout?</p>
        <div className="snav-modal__btns">
          <button className="snav-modal__btn snav-modal__btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="snav-modal__btn snav-modal__btn--danger" onClick={onConfirm}>
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginRequiredModal({ onClose, onLogin }) {
  return (
    <div className="snav-overlay" onClick={onClose}>
      <div className="snav-modal" onClick={(e) => e.stopPropagation()}>
        <div className="snav-modal__icon-wrap snav-modal__icon-wrap--info">
          <FaLock />
        </div>
        <h3 className="snav-modal__title">Login Required</h3>
        <p className="snav-modal__desc">
          Please log in to access this feature.
        </p>
        <div className="snav-modal__btns">
          <button className="snav-modal__btn snav-modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="snav-modal__btn snav-modal__btn--primary" onClick={onLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentNavbar({ activeTab = "" }) {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const {
    notifications,
    unreadCount,
    markRead,
    deleteOne: deleteNotification,
    clearAll,
  } = useNotifications(userId);

  const [currentUser,        setCurrentUser]       = useState(null);
  const [userAvatarSrc,      setUserAvatarSrc]     = useState(
    () => sessionStorage.getItem("studentAvatarDataUrl") || null
  );
  const [cachedRole,         setCachedRole]        = useState(
    () => sessionStorage.getItem("studentUserRole") || null
  );
  const [dropdown,           setDropdown]          = useState(false);
  const [showLogout,         setShowLogout]        = useState(false);
  const [showLoginRequired,  setShowLoginRequired] = useState(false);
  const [showBell,           setShowBell]          = useState(false);
  const [unreadMsgCount,     setUnreadMsgCount]    = useState(0);
  const [mobileMenuOpen,     setMobileMenuOpen]    = useState(false);

  const dropRef   = useRef(null);
  const bellRef   = useRef(null);
  const mobileRef = useRef(null);
  const msgPollRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (raw) => {
        if (!raw) return;
        const user = raw?.data ?? raw?.result ?? raw;
        setCurrentUser(user);
        if (user?.role) {
          sessionStorage.setItem("studentUserRole", user.role);
          setCachedRole(user.role);
        }

        if (user?.profileImage) {
          const photoId  = String(user.profileImage);
          const storedId = sessionStorage.getItem("studentAvatarPhotoId");

          if (storedId !== photoId) sessionStorage.removeItem("studentAvatarDataUrl");
          sessionStorage.setItem("studentAvatarPhotoId", photoId);

          const stored = sessionStorage.getItem("studentAvatarDataUrl");
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
                  sessionStorage.setItem("studentAvatarDataUrl", dataUrl);
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

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current   && !dropRef.current.contains(e.target))   setDropdown(false);
      if (bellRef.current   && !bellRef.current.contains(e.target))   setShowBell(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target)) setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("CurrentUserId");
    sessionStorage.removeItem("studentAvatarDataUrl");
    sessionStorage.removeItem("studentAvatarPhotoId");
    sessionStorage.removeItem("studentUserRole");
    navigate("/Login");
  };

  const handleProtectedNav = (path) => {
    setDropdown(false);
    if (!isLoggedIn) {
      setShowLoginRequired(true);
      return;
    }
    navigate(path);
  };

  const knownLoggedIn = !!localStorage.getItem("CurrentUserId");
  const isLoggedIn    = !!currentUser || knownLoggedIn;
  const userRole      = currentUser?.role ?? cachedRole ?? null;
  const isHost        = userRole === "host";
  const isStudent     = userRole === "student";

  const TABS = [
    { label: "Boardings", href: "/Boardings", icon: <FaHome /> },
    { label: "Foods",     href: "/Foods",     icon: <FaUtensils /> },
  ];

  const currentPath = window.location.pathname;

  return (
    <>
      <nav className="snav" style={{ fontFamily: FONT }}>
        {/* ── Left: Logo + Mobile nav toggle ── */}
        <div className="snav__left">
          <a href="/Boardings" className="snav__logo">
            <img
              src="/Images/logo2.png"
              alt="Unisewana Logo"
              style={{ height: "32px", width: "auto", display: "block" }}
            />
          </a>

          <div className="snav__mobile-nav" ref={mobileRef}>
            <button
              className={`snav__mobile-toggle${mobileMenuOpen ? " snav__mobile-toggle--open" : ""}`}
              onClick={() => setMobileMenuOpen((p) => !p)}
              aria-label="Navigation menu"
            >
              {mobileMenuOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {mobileMenuOpen && (
              <div className="snav__mobile-menu">
                <div className="snav__mobile-menu__label">Navigate</div>
                {TABS.map(({ label, href, icon }) => {
                  const active = currentPath === href || activeTab === label;
                  return (
                    <a
                      key={label}
                      href={href}
                      className={`snav__mobile-menu__item${active ? " snav__mobile-menu__item--active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {icon} {label}
                      {active && <span className="snav__mobile-menu__dot" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Centre: Desktop tabs ── */}
        <div className="snav__tabs">
          {TABS.map(({ label, href }) => {
            const active = currentPath === href || activeTab === label;
            return (
              <a key={label} href={href}
                className={`snav__tab${active ? " snav__tab--active" : ""}`}>
                {label}
                {active && <span className="snav__tab-underline" />}
              </a>
            );
          })}
        </div>

        {/* ── Right: Bell + Hamburger dropdown ── */}
        <div className="snav__right">
          {!isLoggedIn && (
            <button className="snav__login-btn" onClick={() => navigate("/Login")}>
              Login
            </button>
          )}
          {isHost && (
            <button className="snav__host-btn" onClick={() => navigate("/Listings")}>
              Host Page
            </button>
          )}

          {/* Bell */}
          <div className="snav__bell-wrap" ref={bellRef}>
            <button className="snav__bell-btn"
              onClick={() => { setShowBell(p => !p); setDropdown(false); }}
              aria-label="Notifications">
              <FaBell className="snav__bell-icon" />
              {unreadCount > 0 && (
                <span className="snav__bell-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showBell && (
              <div className="snav__bell-dropdown">
                <div className="snav__bell-dropdown__header">
                  <span className="snav__bell-dropdown__title">Notifications</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {unreadCount > 0 && (
                      <span className="snav__bell-count">{unreadCount} new</span>
                    )}
                    {notifications.length > 0 && (
                      <button className="snav__bell-clear" onClick={clearAll}>Clear all</button>
                    )}
                  </div>
                </div>
                <div className="snav__bell-dropdown__divider" />
                {notifications.length === 0 ? (
                  <div className="snav__bell-empty">
                    <FaBell style={{ fontSize: 28, color: "#d1d5db", marginBottom: 8 }} />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <ul className="snav__bell-list">
                    {notifications.map((n) => (
                      <li key={n._id}
                        className={`snav__bell-item${!n.read ? " snav__bell-item--unread" : ""}`}
                        onClick={() => {
                          if (!n.read) markRead(n._id);
                          if (n.link) { setShowBell(false); navigate(n.link); }
                        }}>
                        <div className="snav__bell-item__dot" />
                        <div className="snav__bell-item__body">
                          <div className="snav__bell-item__title">{n.title}</div>
                          <div className="snav__bell-item__msg">{n.message}</div>
                          <div className="snav__bell-item__time">
                            {new Date(n.createdAt).toLocaleString("en-GB", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                            })}
                          </div>
                        </div>
                        <button className="snav__bell-item__del"
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

          {/* Hamburger / profile dropdown */}
          <div ref={dropRef} className="snav__dropdown">
            <button className="snav__menu-btn" onClick={() => setDropdown((p) => !p)}>
              <FaBars className="snav__menu-icon" />
              {userAvatarSrc
                ? <img src={userAvatarSrc} alt="Profile" className="snav__user-avatar"
                    onError={() => setUserAvatarSrc(null)} />
                : <span className="snav__user-icon-wrap"><FaUser className="snav__user-icon" /></span>}
              {unreadMsgCount > 0 && <span className="snav__menu-msg-dot" />}
            </button>

            {dropdown && (
              <div className="snav__dropdown-menu">
                {/* User info — only when logged in */}
                {isLoggedIn && currentUser && (
                  <>
                    <div className="snav__dropdown-user">
                      <span className="snav__dropdown-username">{currentUser.name ?? "User"}</span>
                      <span className="snav__dropdown-email">{currentUser.email ?? ""}</span>
                      <span className={`snav__dropdown-role snav__dropdown-role--${userRole}`}>
                        {userRole}
                      </span>
                    </div>
                    <div className="snav__dropdown-divider" />
                  </>
                )}

                {/* Profile */}
                <div className="snav__dropdown-item"
                  onClick={() => handleProtectedNav("/Profile")}>
                  <FaUser style={{ opacity: 0.7 }} /> Profile
                  {!isLoggedIn && <FaLock className="snav__dropdown-lock" />}
                </div>

                {/* Favourites */}
                {(isStudent || !isLoggedIn) && (
                  <div className="snav__dropdown-item"
                    onClick={() => handleProtectedNav("/Favourites")}>
                    <FaHeart style={{ opacity: 0.7 }} /> Favourites
                    {!isLoggedIn && <FaLock className="snav__dropdown-lock" />}
                  </div>
                )}

                {/* Messages */}
                {(isStudent || isHost || !isLoggedIn) && (
                  <div className="snav__dropdown-item"
                    onClick={() => handleProtectedNav("/Messages")}>
                    <FaEnvelope style={{ opacity: 0.7 }} /> Messages
                    {isLoggedIn && unreadMsgCount > 0 && (
                      <span className="snav__dropdown-msg-badge">
                        {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
                      </span>
                    )}
                    {!isLoggedIn && <FaLock className="snav__dropdown-lock" />}
                  </div>
                )}

                {/* My Orders */}
                {(isStudent || !isLoggedIn) && (
                  <div className="snav__dropdown-item"
                    onClick={() => handleProtectedNav("/StudentOrders")}>
                    <FaReceipt style={{ opacity: 0.7 }} /> My Orders
                    {!isLoggedIn && <FaLock className="snav__dropdown-lock" />}
                  </div>
                )}

                {/* My Bookings */}
                {(isStudent || !isLoggedIn) && (
                  <div className="snav__dropdown-item"
                    onClick={() => handleProtectedNav("/StudentBookings")}>
                    <FaCalendarAlt style={{ opacity: 0.7 }} /> My Bookings
                    {!isLoggedIn && <FaLock className="snav__dropdown-lock" />}
                  </div>
                )}

                <div className="snav__dropdown-divider" />

                {/* Host Page — only when logged in as host */}
                {isHost && (
                  <div className="snav__dropdown-item"
                    onClick={() => { setDropdown(false); navigate("/Listings"); }}>
                    <FaHome style={{ opacity: 0.7 }} /> Host Page
                  </div>
                )}

                {/* Logout */}
                {isLoggedIn && (isStudent || isHost) && (
                  <div className="snav__dropdown-item snav__dropdown-item--danger"
                    onClick={() => { setDropdown(false); setShowLogout(true); }}>
                    <FaSignOutAlt style={{ opacity: 0.7 }} /> Logout
                  </div>
                )}

                {/* Login — logged out visitors */}
                {!isLoggedIn && (
                  <div className="snav__dropdown-item snav__dropdown-item--login"
                    onClick={() => { setDropdown(false); navigate("/Login"); }}>
                    <FaSignInAlt style={{ opacity: 0.7 }} /> Login
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {showLogout && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}

      {showLoginRequired && (
        <LoginRequiredModal
          onClose={() => setShowLoginRequired(false)}
          onLogin={() => { setShowLoginRequired(false); navigate("/Login"); }}
        />
      )}
    </>
  );
}