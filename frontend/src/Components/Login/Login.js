import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function Login() {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    localStorage.removeItem("CurrentUserId");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim())    return setError("Please enter your email.");
    if (!password.trim()) return setError("Please enter your password.");

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/User/login`, { email, password });

      const body = res.data;
      const data = body?.data ?? body;
      const user = data?.user ?? data;

      if (!user?._id) throw new Error("Invalid response from server.");

      localStorage.setItem("CurrentUserId", user._id);

      const role = (user.role ?? "").toLowerCase();
      if (role === "host") {
        navigate("/Listings");
      } else if (role === "admin") {
        navigate("/AdminDashBoard");
      } else {
        navigate("/Boardings");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.error ??
        err.message ??
        "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg__blob login-bg__blob--1" />
        <div className="login-bg__blob login-bg__blob--2" />
        <div className="login-bg__blob login-bg__blob--3" />
      </div>

      <div className="login-wrapper">

        {/* Left / Top orange panel */}
        <div className="login-panel login-panel--left">
          <div className="login-panel__content">
            <h1 className="login-panel__headline">
              Your home<br />away from<br />home.
            </h1>
            <p className="login-panel__sub">
              Find boardings, food services, and everything you need — all in one place built for SLIIT students.
            </p>
          </div>
          <div className="login-panel__footer">
            © 2026 Unisewana.
          </div>
        </div>

        {/* Right / Bottom form panel */}
        <div className="login-panel login-panel--right">
          <div className="login-form-wrapper">

            {/* Logo */}
            <div className="login-brand">
              <img
                src="/Images/logo2.png"
                alt="UniSewana Logo"
                className="login-brand__logo-img"
              />
            </div>

            <form className="login-form" onSubmit={handleLogin} noValidate>

              {error && (
                <div className="login-error" role="alert">
                  <span className="login-error__icon">⚠</span>
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="login-field">
                <label className="login-label" htmlFor="email">Email address</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    className="login-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="login-field">
                <label className="login-label" htmlFor="password">Password</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    className="login-input"
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-show-pass"
                    onClick={() => setShowPass(p => !p)}
                    tabIndex={-1}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
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
                <div style={{ textAlign: "right" }}>
                  <a href="/ForgotPassword" className="login-link" style={{ fontSize: "12px" }}>
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* Submit */}
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? <span className="login-btn__spinner" /> : "Sign in"}
              </button>

              <p className="login-signup-hint">
                Don't have an account?{" "}
                <a href="/Register" className="login-link">Create one</a>
              </p>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}