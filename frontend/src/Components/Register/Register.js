import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Register.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const STEPS = { FORM: "form", OTP: "otp", DONE: "done" };

export default function Register() {
  const navigate = useNavigate();

  const [role,            setRole]            = useState("student");
  const [name,            setName]            = useState("");
  const [username,        setUsername]        = useState("");
  const [email,           setEmail]           = useState("");
  const [phone,           setPhone]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);

  const [digits,      setDigits]      = useState(["", "", "", "", "", ""]);
  const [otpError,    setOtpError]    = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const inputRefs = useRef([]);

  const [step,        setStep]        = useState(STEPS.FORM);
  const [errors,      setErrors]      = useState({});
  const [loading,     setLoading]     = useState(false);
  const [otpLoading,  setOtpLoading]  = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const errs = {};
    const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_\-])[A-Za-z\d@$!%*#?&^_\-]{8,}$/;

    if (!name.trim())     errs.name     = "Full name is required.";
    if (!username.trim()) errs.username = "Username is required.";

    if (!email.trim()) {
      errs.email = "Email is required.";
    } else if (!emailRegex.test(email)) {
      errs.email = "Enter a valid email address.";
    } else if (role === "student" && !email.endsWith("@my.sliit.lk")) {
      errs.email = "Students must use their SLIIT email (@my.sliit.lk).";
    }

    if (phone && !/^0\d{9}$/.test(phone))
      errs.phone = "Phone number must be 10 digits and start with 0 (e.g. 0771234567).";

    if (!password) {
      errs.password = "Password is required.";
    } else if (!passwordRegex.test(password)) {
      errs.password = "Min 8 characters with letters, numbers & a special character (@$!%*#?&^_-).";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    return errs;
  };

  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setOtpError("");
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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/User/send-otp`, { email, role });
      setOtpVerified(false);
      setDigits(["", "", "", "", "", ""]);
      setOtpError("");
      setStep(STEPS.OTP);
    } catch (err) {
      setServerError(err.response?.data?.message ?? "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError("");

    const otp = digits.join("");
    if (otp.length < 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }

    setOtpLoading(true);
    try {
      await axios.post(`${API_BASE}/User/verify-otp`, { email, otp });
      setOtpVerified(true);

      await axios.post(`${API_BASE}/User/register`, {
        name, username, email, password, phone, role,
      });

      setStep(STEPS.DONE);
      setTimeout(() => navigate("/Login"), 2000);
    } catch (err) {
      const msg = err.response?.data?.message ?? "Something went wrong.";
      if (err.response?.status === 400 && !otpVerified) {
        setOtpError(msg);
        return;
      }
      if (otpVerified) {
        setOtpError(`Registration failed: ${msg}`);
        return;
      }
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    setOtpError("");
    setOtpVerified(false);
    setDigits(["", "", "", "", "", ""]);
    try {
      await axios.post(`${API_BASE}/User/send-otp`, { email, role });
      setOtpError("New OTP sent!");
    } catch (err) {
      setOtpError(err.response?.data?.message ?? "Failed to resend OTP.");
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

        {/* Left panel — brand only, no logo */}
        <div className="reg-panel reg-panel--left">
          <div className="reg-panel__content">
            <h1 className="reg-panel__headline">Join the<br />community.</h1>
            <p className="reg-panel__sub">
              Create your account and connect with boardings, food services, and
              everything a SLIIT student needs — all in one place.
            </p>
          </div>
          <div className="reg-panel__footer">© 2026 Unisewana.</div>
        </div>

        {/* Right panel — logo lives here */}
        <div className="reg-panel reg-panel--right">
          <div className="reg-form-wrapper">

            {/* Logo — mirrors Login layout */}
            <div className="reg-brand">
              <img src="/Images/logo2.png" alt="UniSewana Logo" className="reg-brand__logo-img" />
            </div>

            {/* SUCCESS */}
            {step === STEPS.DONE && (
              <div className="reg-success">
                <div className="reg-success__icon">✓</div>
                <h2>Account Created!</h2>
                <p>Redirecting you to login…</p>
              </div>
            )}

            {/* OTP STEP */}
            {step === STEPS.OTP && (
              <>
                <div className="reg-form-header">
                  <h2 className="reg-form-title">Verify your email</h2>
                  <p className="reg-form-sub">
                    We sent a 6-digit OTP to{" "}
                    <strong className="otp-email-highlight">{email}</strong>.
                    <br />It expires in <strong>5 minutes</strong>.
                  </p>
                </div>

                <form className="reg-form" onSubmit={handleVerifyOtp} noValidate>
                  {otpError && (
                    <div className={`reg-error${otpError === "New OTP sent!" ? " reg-error--success" : ""}`} role="alert">
                      <span className="reg-error__icon">{otpError === "New OTP sent!" ? "✓" : "⚠"}</span>
                      {otpError}
                    </div>
                  )}

                  <div className="otp-boxes" onPaste={handlePaste}>
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => inputRefs.current[i] = el}
                        className={`otp-box${d ? " otp-box--filled" : ""}`}
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

                  <button className="reg-btn" type="submit"
                    disabled={otpLoading || digits.join("").length < 6}>
                    {otpLoading ? <span className="reg-btn__spinner" /> : "Verify & Create Account"}
                  </button>

                  <p className="reg-signup-hint">
                    Didn't receive it?{" "}
                    <button type="button" className="reg-link-btn" onClick={handleResend}>Resend OTP</button>
                  </p>
                  <p className="reg-signup-hint" style={{ marginTop: 6 }}>
                    <button type="button" className="reg-link-btn"
                      onClick={() => { setStep(STEPS.FORM); setOtpError(""); setOtpVerified(false); }}>
                      ← Back to form
                    </button>
                  </p>
                </form>
              </>
            )}

            {/* MAIN FORM */}
            {step === STEPS.FORM && (
              <>
                <div className="reg-form-header">
                  <h2 className="reg-form-title">Create account</h2>
                  <p className="reg-form-sub">Fill in your details to get started</p>
                </div>

                <form className="reg-form" onSubmit={handleSendOtp} noValidate>
                  {serverError && (
                    <div className="reg-error" role="alert">
                      <span className="reg-error__icon">⚠</span>
                      {serverError}
                    </div>
                  )}

                  {/* Role */}
                  <div className="reg-field">
                    <label className="reg-label">I am a</label>
                    <div className="reg-role-group">
                      {["student", "host"].map((r) => (
                        <button key={r} type="button"
                          className={`reg-role-btn${role === r ? " reg-role-btn--active" : ""}`}
                          onClick={() => { setRole(r); setEmail(""); setErrors({}); }}>
                          <span>{r === "student" ? "Student" : "Host"}</span>
                        </button>
                      ))}
                    </div>
                    {role === "student" && (
                      <p className="reg-role-note">Students must use their SLIIT email (@my.sliit.lk)</p>
                    )}
                  </div>

                  {/* Name + Username */}
                  <div className="reg-row">
                    <div className="reg-field">
                      <label className="reg-label" htmlFor="name">Full Name</label>
                      <div className="reg-input-wrap">
                        <span className="reg-input-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                        </span>
                        <input id="name" className={`reg-input${errors.name ? " reg-input--error" : ""}`}
                          type="text" placeholder="John Doe" value={name} autoFocus
                          onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }} />
                      </div>
                      {fieldErr("name")}
                    </div>
                    <div className="reg-field">
                      <label className="reg-label" htmlFor="username">Username</label>
                      <div className="reg-input-wrap">
                        <span className="reg-input-icon">@</span>
                        <input id="username" className={`reg-input${errors.username ? " reg-input--error" : ""}`}
                          type="text" placeholder="johndoe99" value={username}
                          onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: "" })); }} />
                      </div>
                      {fieldErr("username")}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="reg-field">
                    <label className="reg-label" htmlFor="email">
                      Email Address
                      {role === "student" && <span className="reg-label-badge">SLIIT only</span>}
                    </label>
                    <div className="reg-input-wrap">
                      <span className="reg-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </span>
                      <input id="email" className={`reg-input${errors.email ? " reg-input--error" : ""}`}
                        type="email" placeholder={role === "student" ? "it21xxxxxx@my.sliit.lk" : "you@example.com"}
                        value={email}
                        onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }} />
                    </div>
                    {fieldErr("email")}
                  </div>

                  {/* Phone */}
                  <div className="reg-field">
                    <label className="reg-label" htmlFor="phone">
                      Phone Number <span className="reg-optional">(optional)</span>
                    </label>
                    <div className="reg-input-wrap">
                      <span className="reg-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                      </span>
                      <input id="phone" className={`reg-input${errors.phone ? " reg-input--error" : ""}`}
                        type="tel" placeholder="0771234567" maxLength={10} value={phone}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "");
                          setPhone(val);
                          setErrors(p => ({ ...p, phone: "" }));
                        }} />
                    </div>
                    {fieldErr("phone")}
                  </div>

                  {/* Password */}
                  <div className="reg-field">
                    <label className="reg-label" htmlFor="password">Password</label>
                    <div className="reg-input-wrap">
                      <span className="reg-input-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <input id="password" className={`reg-input${errors.password ? " reg-input--error" : ""}`}
                        type={showPass ? "text" : "password"}
                        placeholder="Min 8 chars, letters, numbers & symbol"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }} />
                      <button type="button" className="reg-show-pass" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                        {showPass ? (
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
                    {fieldErr("password")}
                    {password && (
                      <div className="reg-pass-hints">
                        <span className={/[A-Za-z]/.test(password) ? "hint--ok" : ""}>Letters</span>
                        <span className={/\d/.test(password) ? "hint--ok" : ""}>Numbers</span>
                        <span className={/[@$!%*#?&^_\-]/.test(password) ? "hint--ok" : ""}>Symbol</span>
                        <span className={password.length >= 8 ? "hint--ok" : ""}>8+ chars</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
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
                      <input id="confirmPassword" className={`reg-input${errors.confirmPassword ? " reg-input--error" : ""}`}
                        type={showConfirm ? "text" : "password"} placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: "" })); }} />
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
                    {loading ? <span className="reg-btn__spinner" /> : "Continue →"}
                  </button>

                  <p className="reg-signup-hint">
                    Already have an account?{" "}
                    <a href="/Login" className="reg-link">Sign in</a>
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