import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../Register/Register.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email } = location.state || {};

  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [errors,          setErrors]          = useState({});
  const [loading,         setLoading]         = useState(false);
  const [done,            setDone]            = useState(false);

  useEffect(() => { if (!email) navigate("/ForgotPassword"); }, [email, navigate]);

  const validate = () => {
    const errs = {};
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_\-])[A-Za-z\d@$!%*#?&^_\-]{8,}$/;

    if (!newPassword) {
      errs.newPassword = "Password is required.";
    } else if (!passwordRegex.test(newPassword)) {
      errs.newPassword = "Min 8 characters with letters, numbers & a special character (@$!%*#?&^_-).";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/User/reset-password`, { email, newPassword });
      setDone(true);
      setTimeout(() => navigate("/Login"), 2500);
    } catch (err) {
      setErrors({ server: err.response?.data?.message ?? "Failed to reset password." });
    } finally {
      setLoading(false);
    }
  };

  const fieldErr = (key) =>
    errors[key] ? <span className="reg-field-err">{errors[key]}</span> : null;

  return (
    <div className="reg-page">
      <div className="reg-bg">
        <div className="reg-bg__blob reg-bg__blob--1" />
        <div className="reg-bg__blob reg-bg__blob--2" />
        <div className="reg-bg__blob reg-bg__blob--3" />
      </div>

      <div className="reg-wrapper">

        {/* Left panel — no logo, no emojis */}
        <div className="reg-panel reg-panel--left">
          <div className="reg-panel__content">
            <h1 className="reg-panel__headline">
              Set a new<br />password.
            </h1>
            <p className="reg-panel__sub">
              Choose a strong password that you haven't used before to keep
              your account secure.
            </p>
          </div>
          <div className="reg-panel__footer">© 2026 Unisewana.</div>
        </div>

        {/* Right panel — logo lives here */}
        <div className="reg-panel reg-panel--right">
          <div className="reg-form-wrapper">

            {/* Logo — consistent across all auth pages */}
            <div className="reg-brand">
              <img
                src="/Images/logo2.png"
                alt="UniSewana Logo"
                className="reg-brand__logo-img"
              />
            </div>

            {done ? (
              <div className="reg-success">
                <div className="reg-success__icon">✓</div>
                <h2>Password Reset!</h2>
                <p>Redirecting you to login…</p>
              </div>
            ) : (
              <>
                <div className="reg-form-header">
                  <h2 className="reg-form-title">New password</h2>
                  <p className="reg-form-sub">
                    Setting new password for{" "}
                    <strong className="otp-email-highlight">{email}</strong>
                  </p>
                </div>

                <form className="reg-form" onSubmit={handleSubmit} noValidate>

                  {errors.server && (
                    <div className="reg-error" role="alert">
                      <span className="reg-error__icon">⚠</span>
                      {errors.server}
                    </div>
                  )}

                  {/* New password */}
                  <div className="reg-field">
                    <label className="reg-label" htmlFor="newPassword">New Password</label>
                    <div className="reg-input-wrap">
                      <span className="reg-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <input
                        id="newPassword"
                        className={`reg-input${errors.newPassword ? " reg-input--error" : ""}`}
                        type={showNew ? "text" : "password"}
                        placeholder="Min 8 chars, letters, numbers & symbol"
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setErrors(p => ({ ...p, newPassword: "" })); }}
                        autoFocus
                      />
                      <button type="button" className="reg-show-pass" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                        {showNew ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErr("newPassword")}
                    {newPassword && (
                      <div className="reg-pass-hints">
                        <span className={/[A-Za-z]/.test(newPassword) ? "hint--ok" : ""}>Letters</span>
                        <span className={/\d/.test(newPassword) ? "hint--ok" : ""}>Numbers</span>
                        <span className={/[@$!%*#?&^_\-]/.test(newPassword) ? "hint--ok" : ""}>Symbol</span>
                        <span className={newPassword.length >= 8 ? "hint--ok" : ""}>8+ chars</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="reg-field">
                    <label className="reg-label" htmlFor="confirmPassword">Confirm Password</label>
                    <div className="reg-input-wrap">
                      <span className="reg-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4"/>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <input
                        id="confirmPassword"
                        className={`reg-input${errors.confirmPassword ? " reg-input--error" : ""}`}
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: "" })); }}
                      />
                      <button type="button" className="reg-show-pass" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                        {showConfirm ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErr("confirmPassword")}
                  </div>

                  <button className="reg-btn" type="submit" disabled={loading}>
                    {loading ? <span className="reg-btn__spinner" /> : "Reset Password"}
                  </button>

                  <p className="reg-signup-hint">
                    <button type="button" className="reg-link-btn" onClick={() => navigate("/ForgotPassword")}>
                      ← Back
                    </button>
                  </p>

                </form>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}