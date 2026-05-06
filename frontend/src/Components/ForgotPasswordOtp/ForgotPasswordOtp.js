import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../Register/Register.css";
import "./OtpVerify.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function ForgotPasswordOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email } = location.state || {};

  const [digits,   setDigits]   = useState(["", "", "", "", "", ""]);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [expired,  setExpired]  = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => { if (!email) navigate("/ForgotPassword"); }, [email, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) { setExpired(true); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleResend = async () => {
    setError(""); setSuccess(""); setExpired(false);
    setDigits(["", "", "", "", "", ""]);
    try {
      await axios.post(`${API_BASE}/User/ForgotPassword`, { email });
      setTimeLeft(300);
      setSuccess("New OTP sent to your email!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to resend OTP.");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    const otp = digits.join("");
    if (otp.length < 6) { setError("Please enter all 6 digits."); return; }
    if (expired)        { setError("OTP expired. Please request a new one."); return; }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/User/forgot-password/verify-otp`, { email, otp });
      navigate("/ResetPassword", { state: { email } });
    } catch (err) {
      setError(err.response?.data?.message ?? "Invalid or expired OTP.");
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
              Check your<br />inbox.
            </h1>
            <p className="reg-panel__sub">
              We sent a 6-digit code to your email. Enter it to verify your
              identity before resetting your password.
            </p>
          </div>
          <div className="reg-panel__footer">© 2026 Unisewana.</div>
        </div>

        {/* Right panel — logo lives here */}
        <div className="reg-panel reg-panel--right">
          <div className="reg-form-wrapper">

            {/* Logo — consistent with Login, Register & ForgotPassword */}
            <div className="reg-brand">
              <img
                src="/Images/logo2.png"
                alt="UniSewana Logo"
                className="reg-brand__logo-img"
              />
            </div>

            <div className="reg-form-header">
              <h2 className="reg-form-title">Verify your email</h2>
              <p className="reg-form-sub">
                We sent a 6-digit code to<br />
                <strong className="otp-email-highlight">{email}</strong>
              </p>
            </div>

            <form className="reg-form" onSubmit={handleVerify} noValidate>

              {error && (
                <div className="reg-error" role="alert">
                  <span className="reg-error__icon">⚠</span>
                  {error}
                </div>
              )}
              {success && (
                <div className="reg-error reg-error--success" role="status">
                  <span className="reg-error__icon">✓</span>
                  {success}
                </div>
              )}

              <div className="otp-boxes" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    className={`otp-box${d ? " otp-box--filled" : ""}${expired ? " otp-box--expired" : ""}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <div className={`otp-timer${expired ? " otp-timer--expired" : ""}`}>
                {expired ? (
                  <span>⏰ Code expired</span>
                ) : (
                  <span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5, verticalAlign: "middle" }}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Code expires in <strong>{formatTime(timeLeft)}</strong>
                  </span>
                )}
              </div>

              <button
                className="reg-btn"
                type="submit"
                disabled={loading || expired || digits.join("").length < 6}
              >
                {loading ? <span className="reg-btn__spinner" /> : "Verify OTP →"}
              </button>

              <p className="reg-signup-hint">
                Didn't receive it?{" "}
                <button type="button" className="reg-link-btn" onClick={handleResend}>
                  Resend OTP
                </button>
              </p>
              <p className="reg-signup-hint" style={{ marginTop: 6 }}>
                <button type="button" className="reg-link-btn" onClick={() => navigate("/ForgotPassword")}>
                  ← Back
                </button>
              </p>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}