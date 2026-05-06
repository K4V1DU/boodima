import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../Register/Register.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Please enter your email address."); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address."); return; }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/User/ForgotPassword`, { email });
      navigate("/ForgotPasswrodOtp", { state: { email } });
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              Forgot your<br />password?
            </h1>
            <p className="reg-panel__sub">
              No worries — enter your registered email and we'll send you a
              verification code to reset it.
            </p>
          </div>
          <div className="reg-panel__footer">© 2026 Unisewana.</div>
        </div>

        {/* Right panel — logo lives here */}
        <div className="reg-panel reg-panel--right">
          <div className="reg-form-wrapper">

            {/* Logo — same position as Login & Register */}
            <div className="reg-brand">
              <img
                src="/Images/logo2.png"
                alt="UniSewana Logo"
                className="reg-brand__logo-img"
              />
            </div>

            <div className="reg-form-header">
              <h2 className="reg-form-title">Reset password</h2>
              <p className="reg-form-sub">Enter your email to receive a verification code</p>
            </div>

            <form className="reg-form" onSubmit={handleSubmit} noValidate>

              {error && (
                <div className="reg-error" role="alert">
                  <span className="reg-error__icon">⚠</span>
                  {error}
                </div>
              )}

              <div className="reg-field">
                <label className="reg-label" htmlFor="email">Email Address</label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    className={`reg-input${error ? " reg-input--error" : ""}`}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    autoFocus
                  />
                </div>
              </div>

              <button className="reg-btn" type="submit" disabled={loading}>
                {loading ? <span className="reg-btn__spinner" /> : "Send OTP →"}
              </button>

              <p className="reg-signup-hint">
                Remembered it?{" "}
                <a href="/Login" className="reg-link">Back to Login</a>
              </p>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}