import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaInfoCircle,
  FaCamera, FaEdit, FaSave, FaTimes, FaLock, FaTrash,
  FaShieldAlt, FaCheckCircle, FaSignOutAlt, FaArrowLeft, FaKey,
} from "react-icons/fa";
import AdminNavBar from '../../NavBar/Admin_NavBar/AdminNavBar';
import "./AdminProfile.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <div className="ap-overlay" onClick={onCancel}>
      <div className="ap-modal" onClick={e => e.stopPropagation()}>
        <div className={`ap-modal__icon ${danger ? "ap-modal__icon--danger" : "ap-modal__icon--warn"}`}>
          {danger ? <FaTrash /> : <FaShieldAlt />}
        </div>
        <h3 className="ap-modal__title">{title}</h3>
        <p className="ap-modal__desc">{message}</p>
        <div className="ap-modal__btns">
          <button className="ap-modal__btn ap-modal__btn--ghost" onClick={onCancel}>Cancel</button>
          <button
            className={`ap-modal__btn ${danger ? "ap-modal__btn--danger" : "ap-modal__btn--primary"}`}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`ap-toast ap-toast--${type}`}>
      {type === "success" ? <FaCheckCircle /> : <FaTimes />}
      <span>{message}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminProfile() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [user,            setUser]            = useState(null);
  const [avatarSrc,       setAvatarSrc]       = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [editMode,        setEditMode]        = useState(false);
  const [activeTab,       setActiveTab]       = useState("profile");
  const [form,            setForm]            = useState({});
  const [pwForm,          setPwForm]          = useState({ current: "", next: "", confirm: "" });
  const [pwError,         setPwError]         = useState("");
  const [toast,           setToast]           = useState(null);
  const [modal,           setModal]           = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [platformStats,   setPlatformStats]   = useState({ totalUsers: 0, accommodations: 0, foodServices: 0 });

  const fileRef = useRef(null);

  useEffect(() => { if (!userId) navigate("/Login"); }, [userId, navigate]);

  // ── Fetch user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(async raw => {
        if (!raw) return;
        const u = unwrap(raw);
        if (u?.role !== "admin") { navigate("/Login"); return; }
        setUser(u);
        setForm({ name: u.name ?? "", phone: u.phone ?? "", address: u.address ?? "", about: u.about ?? "" });

        // Avatar
        if (u?.profileImage) {
          const photoId  = String(u.profileImage);
          const cacheKey = "adminAvatarDataUrl_profile";
          const idKey    = "adminAvatarPhotoId";
          const storedId = sessionStorage.getItem(idKey);
          if (storedId !== photoId) sessionStorage.removeItem(cacheKey);
          sessionStorage.setItem(idKey, photoId);
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            setAvatarSrc(cached);
          } else {
            try {
              const res = await fetch(`${API_BASE}/Photo/${photoId}`);
              if (res.ok) {
                const blob = await res.blob();
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const img = new Image();
                  img.src = ev.target.result;
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX = 200;
                    let w = img.width;
                    let h = img.height;
                    if (w > h) { if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; } }
                    else       { if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; } }
                    canvas.width  = w;
                    canvas.height = h;
                    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
                    try {
                      sessionStorage.setItem(cacheKey, dataUrl);
                      sessionStorage.setItem("adminAvatarDataUrl", dataUrl);
                    } catch (err) {
                      console.warn("sessionStorage quota:", err);
                    }
                    setAvatarSrc(dataUrl);
                  };
                };
                reader.readAsDataURL(blob);
              }
            } catch { /* silent */ }
          }
        }
      })
      .catch(() => setToast({ message: "Failed to load profile.", type: "error" }))
      .finally(() => setLoading(false));
  }, [userId, navigate]);

  // ── Platform stats ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch(`${API_BASE}/User`).then(r => r.ok ? r.json() : {}),
      fetch(`${API_BASE}/Accommodation`).then(r => r.ok ? r.json() : {}),
      fetch(`${API_BASE}/FoodService`).then(r => r.ok ? r.json() : {}),
    ]).then(([uRaw, aRaw, fRaw]) => {
      const users = Array.isArray(unwrap(uRaw)) ? unwrap(uRaw) : [];
      const acc   = Array.isArray(unwrap(aRaw)) ? unwrap(aRaw) : [];
      const fs    = Array.isArray(unwrap(fRaw)) ? unwrap(fRaw) : [];
      setPlatformStats({ totalUsers: users.length, accommodations: acc.length, foodServices: fs.length });
    }).catch(() => {});
  }, [userId]);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      // 1. Backend එකට upload කරනවා
      const formData = new FormData();
      formData.append("photo", file);
      const uploadRes = await fetch(`${API_BASE}/Photo`, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error();
      const uploadData = await uploadRes.json();
      const photoId = unwrap(uploadData)?._id ?? uploadData._id;

      // 2. User record update කරනවා
      const updateRes = await fetch(`${API_BASE}/User/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: photoId }),
      });
      if (!updateRes.ok) throw new Error();

      // 3. Image compress කරලා sessionStorage save කරනවා
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.src = ev.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 200;
          let w = img.width;
          let h = img.height;
          if (w > h) { if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; } }
          else       { if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; } }
          canvas.width  = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          try {
            sessionStorage.setItem("adminAvatarDataUrl",         dataUrl);
            sessionStorage.setItem("adminAvatarDataUrl_profile", dataUrl);
            sessionStorage.setItem("adminAvatarPhotoId",         String(photoId));
          } catch (err) {
            console.warn("sessionStorage quota:", err);
          }
          setAvatarSrc(dataUrl);
        };
      };
      reader.readAsDataURL(file);

      setUser(u => ({ ...u, profileImage: photoId }));
      setToast({ message: "Profile photo updated!", type: "success" });
    } catch {
      setToast({ message: "Failed to upload photo.", type: "error" });
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/User/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(u => ({ ...u, ...form, ...(unwrap(data) ?? {}) }));
      setEditMode(false);
      setToast({ message: "Profile saved successfully!", type: "success" });
    } catch {
      setToast({ message: "Failed to save profile.", type: "error" });
    } finally { setSaving(false); }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    setPwError("");
    const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_-])[A-Za-z\d@$!%*#?&^_-]{8,}$/;
    if (!pwForm.current)                    return setPwError("Enter your current password.");
    if (!pwForm.next)                       return setPwError("Enter a new password.");
    if (!re.test(pwForm.next))              return setPwError("Min 8 chars with letters, numbers & a special character.");
    if (pwForm.next !== pwForm.confirm)     return setPwError("Passwords do not match.");
    if (pwForm.next === pwForm.current)     return setPwError("New password cannot be the same as current.");

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/User/${userId}/change-password`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message ?? "Failed"); }
      setPwForm({ current: "", next: "", confirm: "" });
      setToast({ message: "Password changed!", type: "success" });
    } catch (err) {
      setPwError(err.message || "Failed to change password.");
    } finally { setSaving(false); }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("CurrentUserId");
    sessionStorage.clear();
    navigate("/Login");
  };

  // ── Cancel edit ────────────────────────────────────────────────────────────
  const cancelEdit = () => {
    setForm({ name: user.name ?? "", phone: user.phone ?? "", address: user.address ?? "", about: user.about ?? "" });
    setEditMode(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="ap-page">
      <AdminNavBar />
      <div className="ap-loading"><div className="ap-spinner" /><p>Loading profile…</p></div>
    </div>
  );

  if (!user) return (
    <div className="ap-page">
      <AdminNavBar />
      <div className="ap-loading">
        <p>Could not load profile.</p>
        <button className="ap-btn ap-btn--primary" style={{ marginTop: 12 }} onClick={() => navigate("/Login")}>
          Go to Login
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ap-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {modal?.type === "logout" && (
        <ConfirmModal
          title="Logout" danger
          message="Are you sure you want to logout from the admin panel?"
          confirmLabel="Yes, Logout"
          onConfirm={handleLogout}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Banner */}
      <div className="ap-banner">
        <div className="ap-banner__noise" />
        <div className="ap-banner__content">
          <button className="ap-back-btn" onClick={() => navigate("/AdminDashboard")}>
            <FaArrowLeft /> Dashboard
          </button>
          <div className="ap-banner__title">Admin Profile</div>
        </div>
      </div>

      <div className="ap-container">
        <div className="ap-card">

          {/* Avatar section */}
          <div className="ap-avatar-section">
            <div className="ap-avatar-wrap">
              <div className="ap-avatar">
                {avatarSrc
                  ? <img src={avatarSrc} alt="Profile" className="ap-avatar__img" />
                  : <FaShieldAlt className="ap-avatar__fallback" />}
                {avatarUploading && (
                  <div className="ap-avatar__uploading">
                    <div className="ap-spinner ap-spinner--sm" />
                  </div>
                )}
              </div>
              <button className="ap-avatar__camera" title="Change photo"
                onClick={() => fileRef.current?.click()} disabled={avatarUploading}>
                <FaCamera />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </div>

            <div className="ap-avatar-info">
              <h2 className="ap-username-display">{user.name}</h2>
              <span className="ap-handle">@{user.username}</span>
              <div className="ap-badges">
                <span className="ap-role-badge">
                  <FaShieldAlt style={{ fontSize: 9 }} /> Admin
                </span>
                {user.isVerified?.email && (
                  <span className="ap-verified-badge"><FaCheckCircle /> Email Verified</span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="ap-tabs">
            <button className={`ap-tab${activeTab === "profile" ? " ap-tab--active" : ""}`}
              onClick={() => setActiveTab("profile")}>
              <FaUser /> Profile
            </button>
            <button className={`ap-tab${activeTab === "security" ? " ap-tab--active" : ""}`}
              onClick={() => setActiveTab("security")}>
              <FaLock /> Security
            </button>
          </div>

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="ap-section">
              <div className="ap-section__header">
                <h3 className="ap-section__title">Personal Information</h3>
                {!editMode
                  ? <button className="ap-btn ap-btn--outline" onClick={() => setEditMode(true)}>
                      <FaEdit /> Edit
                    </button>
                  : <div style={{ display: "flex", gap: 8 }}>
                      <button className="ap-btn ap-btn--ghost" onClick={cancelEdit} disabled={saving}>
                        <FaTimes /> Cancel
                      </button>
                      <button className="ap-btn ap-btn--primary" onClick={handleSave} disabled={saving}>
                        {saving ? <div className="ap-spinner ap-spinner--sm ap-spinner--white" /> : <FaSave />}
                        Save
                      </button>
                    </div>
                }
              </div>

              <div className="ap-fields">
                {/* Name */}
                <div className="ap-field">
                  <label className="ap-field__label"><FaUser /> Full Name</label>
                  {editMode
                    ? <input className="ap-input" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    : <div className="ap-field__value">{user.name || <span className="ap-empty">Not set</span>}</div>}
                </div>

                {/* Username read-only */}
                <div className="ap-field">
                  <label className="ap-field__label"><FaUser /> Username</label>
                  <div className="ap-field__value ap-field__value--muted">@{user.username || "—"}</div>
                </div>

                {/* Email read-only */}
                <div className="ap-field">
                  <label className="ap-field__label"><FaEnvelope /> Email</label>
                  <div className="ap-field__value ap-field__value--muted">
                    {user.email}
                    {user.isVerified?.email && <FaCheckCircle className="ap-inline-verified" />}
                  </div>
                </div>

                {/* Phone */}
                <div className="ap-field">
                  <label className="ap-field__label"><FaPhone /> Phone</label>
                  {editMode
                    ? <input className="ap-input" value={form.phone} placeholder="0771234567"
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    : <div className="ap-field__value">{user.phone || <span className="ap-empty">Not set</span>}</div>}
                </div>

                {/* Address */}
                <div className="ap-field">
                  <label className="ap-field__label"><FaMapMarkerAlt /> Address</label>
                  {editMode
                    ? <input className="ap-input" value={form.address} placeholder="Your address"
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                    : <div className="ap-field__value">{user.address || <span className="ap-empty">Not set</span>}</div>}
                </div>

                {/* About */}
                <div className="ap-field ap-field--full">
                  <label className="ap-field__label"><FaInfoCircle /> About</label>
                  {editMode
                    ? <textarea className="ap-textarea" value={form.about} rows={3}
                        onChange={e => setForm(f => ({ ...f, about: e.target.value }))}
                        placeholder="A short bio…" />
                    : <div className="ap-field__value">{user.about || <span className="ap-empty">Not set</span>}</div>}
                </div>

                {/* Platform stats */}
                <div className="ap-field ap-field--full">
                  <label className="ap-field__label"><FaShieldAlt /> Platform Overview</label>
                  <div className="ap-admin-stats">
                    <div className="ap-stat">
                      <span className="ap-stat__num">{platformStats.totalUsers}</span>
                      <span className="ap-stat__label">Users</span>
                    </div>
                    <div className="ap-stat">
                      <span className="ap-stat__num">{platformStats.accommodations}</span>
                      <span className="ap-stat__label">Listings</span>
                    </div>
                    <div className="ap-stat">
                      <span className="ap-stat__num">{platformStats.foodServices}</span>
                      <span className="ap-stat__label">Kitchens</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === "security" && (
            <div className="ap-section">
              <div className="ap-section__header">
                <h3 className="ap-section__title"><FaKey /> Change Password</h3>
              </div>

              <div className="ap-fields">
                <div className="ap-field ap-field--full">
                  <label className="ap-field__label">Current Password</label>
                  <input type="password" className="ap-input" value={pwForm.current}
                    onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                    placeholder="Enter current password" />
                </div>
                <div className="ap-field">
                  <label className="ap-field__label">New Password</label>
                  <input type="password" className="ap-input" value={pwForm.next}
                    onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                    placeholder="Min 8 chars, letters, numbers & symbol" />
                </div>
                <div className="ap-field">
                  <label className="ap-field__label">Confirm New Password</label>
                  <input type="password" className="ap-input" value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repeat new password" />
                </div>

                {pwForm.next && (
                  <div className="ap-field ap-field--full">
                    <div className="ap-pass-hints">
                      <span className={/[A-Za-z]/.test(pwForm.next) ? "hint--ok" : ""}>Letters</span>
                      <span className={/\d/.test(pwForm.next) ? "hint--ok" : ""}>Numbers</span>
                      <span className={/[@$!%*#?&^_\-]/.test(pwForm.next) ? "hint--ok" : ""}>Symbol</span>
                      <span className={pwForm.next.length >= 8 ? "hint--ok" : ""}>8+ chars</span>
                    </div>
                  </div>
                )}

                {pwError && (
                  <div className="ap-field ap-field--full">
                    <p className="ap-error">{pwError}</p>
                  </div>
                )}

                <div className="ap-field ap-field--full">
                  <button className="ap-btn ap-btn--primary" onClick={handlePasswordChange}
                    disabled={saving} style={{ width: "fit-content" }}>
                    {saving ? <div className="ap-spinner ap-spinner--sm ap-spinner--white" /> : <FaLock />}
                    Update Password
                  </button>
                </div>
              </div>

              {/* Account actions */}
              <div className="ap-section__header" style={{ marginTop: 32 }}>
                <h3 className="ap-section__title">Account Actions</h3>
              </div>
              <div className="ap-danger-zone">
                <div className="ap-danger-row">
                  <div>
                    <div className="ap-danger-label">Logout</div>
                    <div className="ap-danger-desc">Sign out of the admin panel on this device.</div>
                  </div>
                  <button className="ap-btn ap-btn--outline" onClick={() => setModal({ type: "logout" })}>
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}