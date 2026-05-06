import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaInfoCircle,
  FaLanguage, FaHeart, FaCamera, FaEdit, FaSave, FaTimes,
  FaLock, FaTrash, FaStar, FaShieldAlt, FaCheckCircle,
  FaSignOutAlt, FaArrowLeft, FaKey,
} from "react-icons/fa";
import "./UserProfile.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function unwrap(raw) {
  return raw?.data ?? raw?.result ?? raw;
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <div className="up-overlay" onClick={onCancel}>
      <div className="up-modal" onClick={e => e.stopPropagation()}>
        <div className={`up-modal__icon ${danger ? "up-modal__icon--danger" : "up-modal__icon--warn"}`}>
          {danger ? <FaTrash /> : <FaShieldAlt />}
        </div>
        <h3 className="up-modal__title">{title}</h3>
        <p className="up-modal__desc">{message}</p>
        <div className="up-modal__btns">
          <button className="up-modal__btn up-modal__btn--ghost" onClick={onCancel}>Cancel</button>
          <button
            className={`up-modal__btn ${danger ? "up-modal__btn--danger" : "up-modal__btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`up-toast up-toast--${type}`}>
      {type === "success" ? <FaCheckCircle /> : <FaTimes />}
      <span>{message}</span>
    </div>
  );
}

// ─── Tag Input ────────────────────────────────────────────────────────────────
function TagInput({ tags = [], onChange, placeholder }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) { onChange([...tags, v]); }
    setInput("");
  };
  const remove = (t) => onChange(tags.filter(x => x !== t));
  return (
    <div className="up-tag-input">
      <div className="up-tag-list">
        {tags.map(t => (
          <span key={t} className="up-tag">
            {t}
            <button type="button" onClick={() => remove(t)}><FaTimes /></button>
          </span>
        ))}
      </div>
      <div className="up-tag-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="up-tag-field"
        />
        <button type="button" className="up-tag-add" onClick={add}>Add</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserProfile() {
  const navigate  = useNavigate();
  const userId    = localStorage.getItem("CurrentUserId");

  // ── State ────
  const [user,        setUser]        = useState(null);
  const [avatarSrc,   setAvatarSrc]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [editMode,    setEditMode]    = useState(false);
  const [activeTab,   setActiveTab]   = useState("profile"); // profile | security
  const [form,        setForm]        = useState({});
  const [pwForm,      setPwForm]      = useState({ current: "", next: "", confirm: "" });
  const [pwError,     setPwError]     = useState("");
  const [toast,       setToast]       = useState(null);
  const [modal,       setModal]       = useState(null); // { type: "delete"|"logout" }
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fileRef = useRef(null);

  // ── Redirect if not logged in ──
  useEffect(() => {
    if (!userId) navigate("/Login");
  }, [userId, navigate]);

  // ── Fetch user ──
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(async raw => {
        if (!raw) return;
        const u = unwrap(raw);
        setUser(u);
        setForm({
          name:      u.name      ?? "",
          username:  u.username  ?? "",
          phone:     u.phone     ?? "",
          address:   u.address   ?? "",
          about:     u.about     ?? "",
          languages: u.languages ?? [],
          interests: u.interests ?? [],
        });

        // Avatar
        if (u?.profileImage) {
          const photoId  = String(u.profileImage);
          const cacheKey = `profileAvatarDataUrl_${userId}`;
          const idKey    = `profileAvatarPhotoId_${userId}`;
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
                const blob   = await res.blob();
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result;
                  sessionStorage.setItem(cacheKey, dataUrl);
                  setAvatarSrc(dataUrl);
                };
                reader.readAsDataURL(blob);
              }
            } catch { /* silent */ }
          }
        }
      })
      .catch(() => setToast({ message: "Failed to load profile.", type: "error" }))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const uploadRes = await fetch(`${API_BASE}/Photo`, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const photoId    = unwrap(uploadData)?._id ?? unwrap(uploadData)?.id ?? uploadData._id;

      // Save photo ID to user
      const updateRes = await fetch(`${API_BASE}/User/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: photoId }),
      });
      if (!updateRes.ok) throw new Error("Profile update failed");

      // Cache & show
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl  = reader.result;
        const cacheKey = `profileAvatarDataUrl_${userId}`;
        const idKey    = `profileAvatarPhotoId_${userId}`;
        sessionStorage.setItem(cacheKey, dataUrl);
        sessionStorage.setItem(idKey, String(photoId));
        // Also update navbar caches
        sessionStorage.setItem("studentAvatarDataUrl", dataUrl);
        sessionStorage.setItem("hostAvatarDataUrl",    dataUrl);
        setAvatarSrc(dataUrl);
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
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const updated = unwrap(data);
      setUser(u => ({ ...u, ...form, ...(updated ?? {}) }));
      setEditMode(false);
      setToast({ message: "Profile saved successfully!", type: "success" });
    } catch {
      setToast({ message: "Failed to save profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    setPwError("");

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_-])[A-Za-z\d@$!%*#?&^_-]{8,}$/;

    if (!pwForm.current)
      return setPwError("Enter your current password.");
    if (!pwForm.next)
      return setPwError("Enter a new password.");
    if (!passwordRegex.test(pwForm.next))
      return setPwError("New password must be at least 8 characters and include letters, numbers & a special character (@$!%*#?&^_-).");
    if (pwForm.next !== pwForm.confirm)
      return setPwError("Passwords do not match.");
    if (pwForm.next === pwForm.current)
      return setPwError("New password cannot be the same as your current password.");

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/User/${userId}/change-password`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Failed");
      }
      setPwForm({ current: "", next: "", confirm: "" });
      setToast({ message: "Password changed!", type: "success" });
    } catch (err) {
      setPwError(err.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await fetch(`${API_BASE}/User/${userId}`, { method: "DELETE" });
      localStorage.removeItem("CurrentUserId");
      sessionStorage.clear();
      navigate("/Login");
    } catch {
      setToast({ message: "Failed to delete account.", type: "error" });
    }
    setModal(null);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("CurrentUserId");
    sessionStorage.clear();
    navigate("/Login");
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const cancelEdit = () => {
    setForm({
      name:      user.name      ?? "",
      username:  user.username  ?? "",
      phone:     user.phone     ?? "",
      address:   user.address   ?? "",
      about:     user.about     ?? "",
      languages: user.languages ?? [],
      interests: user.interests ?? [],
    });
    setEditMode(false);
  };

  const isHost    = user?.role === "host";
  const isStudent = user?.role === "student";

  // ── Back route by role ─────────────────────────────────────────────────────
  const backHref = isHost ? "/Listings" : "/Boardings";

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="up-page">
        <div className="up-loading">
          <div className="up-spinner" />
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="up-page">
        <div className="up-loading">
          <p>Could not load profile.</p>
          <button className="up-btn up-btn--primary" onClick={() => navigate("/Login")}>Go to Login</button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="up-page">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modals */}
      {modal?.type === "delete" && (
        <ConfirmModal
          title="Delete Account"
          message="This will permanently delete your account and all data. This cannot be undone."
          confirmLabel="Delete My Account"
          danger
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "logout" && (
        <ConfirmModal
          title="Logout"
          message="Are you sure you want to logout?"
          confirmLabel="Yes, Logout"
          danger
          onConfirm={handleLogout}
          onCancel={() => setModal(null)}
        />
      )}

      {/* ── Header banner ── */}
      <div className="up-banner">
        <div className="up-banner__noise" />
        <div className="up-banner__content">
          <button className="up-back-btn" onClick={() => navigate(backHref)}>
            <FaArrowLeft /> Back
          </button>
          <div className="up-banner__title">
            {isHost ? "Host Profile" : "My Profile"}
          </div>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="up-container">
        <div className="up-card">

          {/* Avatar section */}
          <div className="up-avatar-section">
            <div className="up-avatar-wrap">
              <div className="up-avatar">
                {avatarSrc
                  ? <img src={avatarSrc} alt="Profile" className="up-avatar__img" />
                  : <FaUser className="up-avatar__fallback" />}
                {avatarUploading && <div className="up-avatar__uploading"><div className="up-spinner up-spinner--sm" /></div>}
              </div>
              <button
                className="up-avatar__camera"
                onClick={() => fileRef.current?.click()}
                title="Change photo"
                disabled={avatarUploading}
              >
                <FaCamera />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </div>

            <div className="up-avatar-info">
              <h2 className="up-username-display">{user.name}</h2>
              <span className="up-handle">@{user.username}</span>
              <div className="up-badges">
                <span className={`up-role-badge up-role-badge--${user.role}`}>{user.role}</span>
                {isHost && (
                  <span className="up-host-badge">
                    <FaStar /> Verified Host
                  </span>
                )}
                {user.isVerified?.email && (
                  <span className="up-verified-badge">
                    <FaCheckCircle /> Email Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="up-tabs">
            <button
              className={`up-tab${activeTab === "profile" ? " up-tab--active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <FaUser /> Profile
            </button>
            <button
              className={`up-tab${activeTab === "security" ? " up-tab--active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <FaLock /> Security
            </button>
          </div>

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="up-section">
              <div className="up-section__header">
                <h3 className="up-section__title">Personal Information</h3>
                {!editMode
                  ? <button className="up-btn up-btn--outline" onClick={() => setEditMode(true)}>
                      <FaEdit /> Edit
                    </button>
                  : <div style={{ display: "flex", gap: 8 }}>
                      <button className="up-btn up-btn--ghost" onClick={cancelEdit} disabled={saving}>
                        <FaTimes /> Cancel
                      </button>
                      <button className="up-btn up-btn--primary" onClick={handleSave} disabled={saving}>
                        {saving ? <div className="up-spinner up-spinner--sm up-spinner--white" /> : <FaSave />}
                        Save
                      </button>
                    </div>
                }
              </div>

              <div className="up-fields">
                {/* Name */}
                <div className="up-field">
                  <label className="up-field__label"><FaUser /> Full Name</label>
                  {editMode
                    ? <input className="up-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    : <div className="up-field__value">{user.name || <span className="up-empty">Not set</span>}</div>}
                </div>

                {/* Username */}
                <div className="up-field">
                  <label className="up-field__label"><FaUser /> Username</label>
                  {editMode
                    ? <input className="up-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                    : <div className="up-field__value">{user.username || <span className="up-empty">Not set</span>}</div>}
                </div>

                {/* Email — read-only */}
                <div className="up-field">
                  <label className="up-field__label"><FaEnvelope /> Email</label>
                  <div className="up-field__value up-field__value--muted">
                    {user.email}
                    {user.isVerified?.email && <FaCheckCircle className="up-inline-verified" />}
                  </div>
                </div>

                {/* Phone */}
                <div className="up-field">
                  <label className="up-field__label"><FaPhone /> Phone</label>
                  {editMode
                    ? <input className="up-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+94 7X XXX XXXX" />
                    : <div className="up-field__value">{user.phone || <span className="up-empty">Not set</span>}</div>}
                </div>

                {/* Address */}
                <div className="up-field">
                  <label className="up-field__label"><FaMapMarkerAlt /> Address</label>
                  {editMode
                    ? <input className="up-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Your address" />
                    : <div className="up-field__value">{user.address || <span className="up-empty">Not set</span>}</div>}
                </div>

                {/* About — full width */}
                <div className="up-field up-field--full">
                  <label className="up-field__label"><FaInfoCircle /> About</label>
                  {editMode
                    ? <textarea className="up-textarea" value={form.about} rows={3}
                        onChange={e => setForm(f => ({ ...f, about: e.target.value }))}
                        placeholder="Tell others a bit about yourself…" />
                    : <div className="up-field__value">{user.about || <span className="up-empty">Not set</span>}</div>}
                </div>

                {/* Languages */}
                <div className="up-field up-field--full">
                  <label className="up-field__label"><FaLanguage /> Languages</label>
                  {editMode
                    ? <TagInput tags={form.languages} onChange={v => setForm(f => ({ ...f, languages: v }))} placeholder="Type a language & press Enter" />
                    : <div className="up-tag-display">
                        {(user.languages ?? []).length > 0
                          ? user.languages.map(l => <span key={l} className="up-tag up-tag--readonly">{l}</span>)
                          : <span className="up-empty">Not set</span>}
                      </div>}
                </div>

                {/* Interests (students) */}
                {isStudent && (
                  <div className="up-field up-field--full">
                    <label className="up-field__label"><FaHeart /> Interests</label>
                    {editMode
                      ? <TagInput tags={form.interests} onChange={v => setForm(f => ({ ...f, interests: v }))} placeholder="Type an interest & press Enter" />
                      : <div className="up-tag-display">
                          {(user.interests ?? []).length > 0
                            ? user.interests.map(i => <span key={i} className="up-tag up-tag--readonly up-tag--interest">{i}</span>)
                            : <span className="up-empty">Not set</span>}
                        </div>}
                  </div>
                )}

                {/* Host stats */}
                {isHost && user.stats && (
                  <div className="up-field up-field--full">
                    <label className="up-field__label"><FaStar /> Host Stats</label>
                    <div className="up-host-stats">
                      <div className="up-stat">
                        <span className="up-stat__num">{user.stats.totalReviews ?? 0}</span>
                        <span className="up-stat__label">Reviews</span>
                      </div>
                      <div className="up-stat">
                        <span className="up-stat__num">{user.stats.hostRating?.toFixed(1) ?? "—"}</span>
                        <span className="up-stat__label">Rating</span>
                      </div>
                      {user.stats.hostSince && (
                        <div className="up-stat">
                          <span className="up-stat__num">
                            {new Date(user.stats.hostSince).getFullYear()}
                          </span>
                          <span className="up-stat__label">Host Since</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === "security" && (
            <div className="up-section">

              {/* Change Password */}
              <div className="up-section__header">
                <h3 className="up-section__title"><FaKey /> Change Password</h3>
              </div>

              <div className="up-fields">
                {/* Current Password */}
                <div className="up-field up-field--full">
                  <label className="up-field__label">Current Password</label>
                  <input
                    type="password" className="up-input"
                    value={pwForm.current}
                    onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                    placeholder="Enter current password"
                  />
                </div>

                {/* New Password */}
                <div className="up-field">
                  <label className="up-field__label">New Password</label>
                  <input
                    type="password" className="up-input"
                    value={pwForm.next}
                    onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                    placeholder="Min 8 chars, letters, numbers & symbol"
                  />
                </div>

                {/* Confirm New Password */}
                <div className="up-field">
                  <label className="up-field__label">Confirm New Password</label>
                  <input
                    type="password" className="up-input"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                </div>

                {/* Password strength hints */}
                {pwForm.next && (
                  <div className="up-field up-field--full">
                    <div className="up-pass-hints">
                      <span className={/[A-Za-z]/.test(pwForm.next) ? "hint--ok" : ""}>Letters</span>
                      <span className={/\d/.test(pwForm.next) ? "hint--ok" : ""}>Numbers</span>
                      <span className={/[@$!%*#?&^_\-]/.test(pwForm.next) ? "hint--ok" : ""}>Symbol</span>
                      <span className={pwForm.next.length >= 8 ? "hint--ok" : ""}>8+ chars</span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {pwError && (
                  <div className="up-field up-field--full">
                    <p className="up-error">{pwError}</p>
                  </div>
                )}

                {/* Submit */}
                <div className="up-field up-field--full">
                  <button
                    className="up-btn up-btn--primary"
                    onClick={handlePasswordChange}
                    disabled={saving}
                    style={{ width: "fit-content" }}
                  >
                    {saving ? <div className="up-spinner up-spinner--sm up-spinner--white" /> : <FaLock />}
                    Update Password
                  </button>
                </div>
              </div>

              {/* Account actions */}
              <div className="up-section__header" style={{ marginTop: 32 }}>
                <h3 className="up-section__title">Account Actions</h3>
              </div>

              <div className="up-danger-zone">
                <div className="up-danger-row">
                  <div>
                    <div className="up-danger-label">Logout</div>
                    <div className="up-danger-desc">Sign out of your account on this device.</div>
                  </div>
                  <button
                    className="up-btn up-btn--outline"
                    onClick={() => setModal({ type: "logout" })}
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>

                <div className="up-danger-row up-danger-row--red">
                  <div>
                    <div className="up-danger-label">Delete Account</div>
                    <div className="up-danger-desc">Permanently remove your account and all associated data. This action is irreversible.</div>
                  </div>
                  <button
                    className="up-btn up-btn--danger"
                    onClick={() => setModal({ type: "delete" })}
                  >
                    <FaTrash /> Delete
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