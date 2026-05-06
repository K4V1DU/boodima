import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaSearch, FaPaperPlane, FaEllipsisV,
  FaTrash, FaCheckDouble, FaCheck,
  FaChevronDown, FaUser, FaArrowLeft,
} from "react-icons/fa";
import "./Messages.css";
import StudentNavbar from "../NavBar/Student_NavBar/StudentNavbar";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_BASE_URL;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }
const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(date) {
  if (!date) return "";
  const d   = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatMessageTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function groupMessagesByDate(messages) {
  const groups = [];
  let lastDate  = null;
  messages.forEach(msg => {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      const now      = new Date();
      const d        = new Date(msg.createdAt);
      const diffDays = Math.floor((now - d) / 86400000);
      let label = d.toDateString() === now.toDateString()
        ? "Today"
        : diffDays === 1
          ? "Yesterday"
          : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      groups.push({ type: "date", label });
      lastDate = msgDate;
    }
    groups.push({ type: "message", data: msg });
  });
  return groups;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }) {
  const src = photoSrc(user?.profileImage);
  return (
    <div className="msg-avatar" style={{ width: size, height: size }}>
      {src
        ? <img src={src} alt={user?.name} onError={e => { e.currentTarget.style.display="none"; }} />
        : <span className="msg-avatar__fallback">{(user?.name ?? "?")[0].toUpperCase()}</span>}
    </div>
  );
}

// ─── Conversation Item ────────────────────────────────────────────────────────
function ConversationItem({ conv, currentUserId, isActive, onClick, onDelete }) {
  const other       = conv.participants?.find(p => p._id !== currentUserId);
  const unread      = conv.unreadCount?.[currentUserId] ?? 0;
  const lastContent = conv.lastMessage?.content ?? "";
  const lastTime    = conv.lastMessage?.createdAt;

  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef(null);
  const menuRef        = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => setShowMenu(true), 500);
  };
  const handlePressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  return (
    <div
      className={`msg-conv-item${isActive ? " msg-conv-item--active" : ""}`}
      onClick={() => { if (!showMenu) onClick(); }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      style={{ position: "relative", userSelect: "none" }}
    >
      <Avatar user={other} size={46} />
      <div className="msg-conv-item__body">
        <div className="msg-conv-item__top">
          <span className="msg-conv-item__name">{other?.name ?? "User"}</span>
          <span className="msg-conv-item__time">{formatTime(lastTime)}</span>
        </div>
        <div className="msg-conv-item__bottom">
          <span className="msg-conv-item__preview">{lastContent || "No messages yet"}</span>
          {unread > 0 && <span className="msg-conv-item__badge">{unread > 99 ? "99+" : unread}</span>}
        </div>
      </div>

      {showMenu && (
        <div className="msg-conv-menu" ref={menuRef} onClick={e => e.stopPropagation()}>
          <button
            className="msg-conv-menu__item msg-conv-menu__item--danger"
            onClick={() => { setShowMenu(false); onDelete(conv._id); }}
          >
            <FaTrash style={{ fontSize: 12 }} /> Delete conversation
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showMenu, onMenuToggle, onDelete }) {
  return (
    <div className={`msg-bubble-wrap${isMine ? " msg-bubble-wrap--mine" : ""}`}>
      <div
        className={`msg-bubble${isMine ? " msg-bubble--mine" : " msg-bubble--theirs"}`}
        onContextMenu={e => { e.preventDefault(); onMenuToggle(msg._id); }}
      >
        <span className="msg-bubble__text">{msg.content}</span>
        <div className="msg-bubble__meta">
          <span className="msg-bubble__time">{formatMessageTime(msg.createdAt)}</span>
          {isMine && (
            <span className="msg-bubble__read">
              {msg.isRead
                ? <FaCheckDouble style={{ color: "#53bdeb" }} />
                : <FaCheck style={{ color: "rgba(255,255,255,0.6)" }} />}
            </span>
          )}
        </div>

        {showMenu && (
          <div className={`msg-bubble__menu${isMine ? " msg-bubble__menu--mine" : ""}`}>
            <button onClick={() => onDelete(msg._id)}>
              <FaTrash style={{ fontSize: 11 }} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Messages() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const currentUserId = localStorage.getItem("CurrentUserId") ?? "";

  const autoOpenIdRef = useRef(location.state?.openConversationId ?? null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [conversations,     setConversations]     = useState([]);
  const [activeConv,        setActiveConv]        = useState(null);
  const [messages,          setMessages]          = useState([]);
  const [input,             setInput]             = useState("");
  const [searchQuery,       setSearchQuery]       = useState("");
  const [loadingConvs,      setLoadingConvs]      = useState(true);
  const [loadingMsgs,       setLoadingMsgs]       = useState(false);
  const [sendingMsg,        setSendingMsg]        = useState(false);
  const [page,              setPage]              = useState(1);
  const [hasMore,           setHasMore]           = useState(true);
  const [menuOpenId,        setMenuOpenId]        = useState(null);
  const [showScrollBtn,     setShowScrollBtn]     = useState(false);
  const [currentUser,       setCurrentUser]       = useState(null);
  // NEW: tracks which panel is visible on mobile ("sidebar" | "chat")
  const [mobilePanel,       setMobilePanel]       = useState("sidebar");

  const messagesEndRef  = useRef(null);
  const messagesBodyRef = useRef(null);
  const inputRef        = useRef(null);
  const pollingRef      = useRef(null);

  // ── Fetch current user ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) { navigate("/Login"); return; }
    fetch(`${API_BASE}/User/${currentUserId}`)
      .then(r => r.json()).then(raw => setCurrentUser(unwrap(raw))).catch(() => {});
  }, []);

  // ── Fetch conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res  = await fetch(`${API_BASE}/message/conversations/${currentUserId}`);
      const raw  = await res.json();
      const list = unwrap(raw);
      setConversations(Array.isArray(list) ? list : []);
    } catch { /* silent */ }
    finally { setLoadingConvs(false); }
  }, [currentUserId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Auto-open conversation from navigation state (one-shot) ───────────────
  useEffect(() => {
    const targetId = autoOpenIdRef.current;
    if (!targetId || conversations.length === 0) return;
    const conv = conversations.find(c => c._id === targetId);
    if (conv) {
      autoOpenIdRef.current = null;
      window.history.replaceState({}, "", window.location.pathname);
      openConversation(conv);
    }
  }, [conversations]);

  // ── Fetch messages (paginated) ─────────────────────────────────────────────
  const fetchMessages = useCallback(async (convId, pg = 1, prepend = false) => {
    if (!convId) return;
    setLoadingMsgs(true);
    try {
      const res  = await fetch(`${API_BASE}/message/${convId}?page=${pg}&limit=30`);
      const raw  = await res.json();
      const list = unwrap(raw);
      const msgs = Array.isArray(list) ? list : [];
      if (prepend) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 50);
      }
      setHasMore(msgs.length === 30);
    } catch { /* silent */ }
    finally { setLoadingMsgs(false); }
  }, []);

  // ── Delete conversation ────────────────────────────────────────────────────
  const handleDeleteConversation = async (convId) => {
    try {
      await fetch(`${API_BASE}/message/conversation/${convId}`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: currentUserId }),
      });
      setConversations(prev => prev.filter(c => c._id !== convId));
      if (activeConv?._id === convId) {
        setActiveConv(null);
        setMessages([]);
        setMobilePanel("sidebar"); // go back to list on mobile
      }
    } catch { /* silent */ }
  };

  // ── Open a conversation ────────────────────────────────────────────────────
  const openConversation = async (conv) => {
    setActiveConv(conv);
    setMessages([]);
    setPage(1);
    setHasMore(true);
    setMenuOpenId(null);
    setMobilePanel("chat"); // slide to chat panel on mobile
    await fetchMessages(conv._id, 1, false);

    await fetch(`${API_BASE}/message/read/${conv._id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: currentUserId }),
    }).catch(() => {});

    setConversations(prev => prev.map(c =>
      c._id === conv._id
        ? { ...c, unreadCount: { ...c.unreadCount, [currentUserId]: 0 } }
        : c
    ));

    inputRef.current?.focus();
  };

  // ── Back to sidebar (mobile) ───────────────────────────────────────────────
  const handleBackToSidebar = () => {
    setMobilePanel("sidebar");
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeConv || sendingMsg) return;

    setInput("");
    setSendingMsg(true);

    const optimistic = {
      _id:       `opt_${Date.now()}`,
      content:   text,
      sender:    { _id: currentUserId },
      isRead:    false,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res  = await fetch(`${API_BASE}/message/send`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ conversationId: activeConv._id, senderId: currentUserId, content: text }),
      });
      const raw  = await res.json();
      const sent = unwrap(raw);

      setMessages(prev => prev.map(m => m._id === optimistic._id ? sent : m));

      setConversations(prev => prev.map(c =>
        c._id === activeConv._id
          ? { ...c, lastMessage: { content: text, sender: currentUserId, createdAt: sent.createdAt } }
          : c
      ).sort((a, b) => new Date(b.lastMessage?.createdAt ?? 0) - new Date(a.lastMessage?.createdAt ?? 0)));
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setInput(text);
    } finally {
      setSendingMsg(false);
    }
  };

  // ── Delete message ─────────────────────────────────────────────────────────
  const handleDeleteMessage = async (messageId) => {
    setMenuOpenId(null);
    try {
      await fetch(`${API_BASE}/message/${messageId}`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: currentUserId }),
      });
      setMessages(prev => prev.filter(m => m._id !== messageId));
    } catch { /* silent */ }
  };

  // ── Load more on scroll up ─────────────────────────────────────────────────
  const handleScroll = () => {
    const el = messagesBodyRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !loadingMsgs && activeConv) {
      const nextPage = page + 1;
      setPage(nextPage);
      const prevScrollHeight = el.scrollHeight;
      fetchMessages(activeConv._id, nextPage, true).then(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevScrollHeight;
        });
      });
    }
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 300);
  };

  // ── Polling for new messages ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeConv) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API_BASE}/message/${activeConv._id}?page=1&limit=30`);
        const raw  = await res.json();
        const list = unwrap(raw);
        const msgs = Array.isArray(list) ? list : [];
        setMessages(prev => {
          if (msgs.length > prev.filter(m => !m.optimistic).length) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            return msgs;
          }
          return prev;
        });
        fetchConversations();
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(pollingRef.current);
  }, [activeConv]);

  // ── Close bubble menu on outside click ────────────────────────────────────
  useEffect(() => {
    const h = () => setMenuOpenId(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  // ── Keyboard send ──────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter(c => {
    const other = c.participants?.find(p => p._id !== currentUserId);
    return other?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const otherUser   = activeConv?.participants?.find(p => p._id !== currentUserId);
  const grouped     = groupMessagesByDate(messages);
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount?.[currentUserId] ?? 0), 0);

  const userRole = currentUser?.role ?? sessionStorage.getItem("studentUserRole") ?? null;

  return (
    <div className="msg-page">
      {userRole === "host"
        ? <HostNavbar />
        : <StudentNavbar />
      }

      {/*
        msg-layout now uses a sliding approach on mobile.
        data-panel="sidebar" | "chat" drives the CSS transform.
      */}
      <div className="msg-layout" data-mobile-panel={mobilePanel}>

        {/* ══ LEFT: Conversations ══ */}
        <aside className="msg-sidebar">
          <div className="msg-sidebar__header">
            <div className="msg-sidebar__title-row">
              <div className="msg-sidebar__user">
                <Avatar user={currentUser} size={36} />
                <span className="msg-sidebar__username">{currentUser?.name ?? "Messages"}</span>
              </div>
              {totalUnread > 0 && (
                <span className="msg-sidebar__total-badge">{totalUnread}</span>
              )}
            </div>
            <div className="msg-sidebar__search">
              <FaSearch className="msg-sidebar__search-icon" />
              <input
                className="msg-sidebar__search-input"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="msg-sidebar__list">
            {loadingConvs ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="msg-conv-skeleton">
                  <div className="msg-conv-skeleton__avatar" />
                  <div className="msg-conv-skeleton__lines">
                    <div className="msg-conv-skeleton__line msg-conv-skeleton__line--wide" />
                    <div className="msg-conv-skeleton__line" />
                  </div>
                </div>
              ))
            ) : filteredConvs.length === 0 ? (
              <div className="msg-sidebar__empty">
                <FaUser style={{ fontSize: 28, color: "#ccc", marginBottom: 8 }} />
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredConvs.map(conv => (
                <ConversationItem
                  key={conv._id}
                  conv={conv}
                  currentUserId={currentUserId}
                  isActive={activeConv?._id === conv._id}
                  onClick={() => openConversation(conv)}
                  onDelete={handleDeleteConversation}
                />
              ))
            )}
          </div>
        </aside>

        {/* ══ RIGHT: Chat window ══ */}
        <main className="msg-chat">
          {!activeConv ? (
            <div className="msg-chat__empty">
              <img src="/Images/icon9.png" alt="Messages" className="msg-chat__empty-img" />
              <h2 className="msg-chat__empty-title">Your Messages</h2>
              <p className="msg-chat__empty-sub">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header — back arrow only visible on mobile */}
              <div className="msg-chat__header">
                <button
                  className="msg-chat__back-btn"
                  onClick={handleBackToSidebar}
                  aria-label="Back to conversations"
                >
                  <FaArrowLeft />
                </button>
                <Avatar user={otherUser} size={40} />
                <div className="msg-chat__header-info">
                  <span className="msg-chat__header-name">{otherUser?.name ?? "User"}</span>
                  <span className="msg-chat__header-role">{otherUser?.role ?? ""}</span>
                </div>
              </div>

              {/* Messages body */}
              <div
                className="msg-chat__body"
                ref={messagesBodyRef}
                onScroll={handleScroll}
                onClick={() => setMenuOpenId(null)}
              >
                {loadingMsgs && page === 1 ? (
                  <div className="msg-chat__loading">
                    <div className="msg-chat__loading-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                ) : (
                  <>
                    {loadingMsgs && page > 1 && (
                      <div className="msg-chat__load-more">Loading older messages…</div>
                    )}
                    {grouped.map((item, i) =>
                      item.type === "date" ? (
                        <div key={`date-${i}`} className="msg-date-divider">
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <MessageBubble
                          key={item.data._id}
                          msg={item.data}
                          isMine={
                            (item.data.sender?._id ?? item.data.sender) === currentUserId
                          }
                          showMenu={menuOpenId === item.data._id}
                          onMenuToggle={id => setMenuOpenId(prev => prev === id ? null : id)}
                          onDelete={handleDeleteMessage}
                        />
                      )
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}

                {showScrollBtn && (
                  <button className="msg-scroll-btn"
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}>
                    <FaChevronDown />
                  </button>
                )}
              </div>

              {/* Input bar */}
              <div className="msg-chat__input-bar">
                <textarea
                  ref={inputRef}
                  className="msg-chat__input"
                  placeholder="Type a message…"
                  value={input}
                  rows={1}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={`msg-chat__send-btn${input.trim() ? " msg-chat__send-btn--active" : ""}`}
                  onClick={handleSend}
                  disabled={!input.trim() || sendingMsg}
                >
                  <FaPaperPlane />
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}