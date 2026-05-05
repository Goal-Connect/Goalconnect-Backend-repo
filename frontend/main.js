import { io } from 'socket.io-client';

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL    = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// ─── State ────────────────────────────────────────────────────────────────────
let token             = localStorage.getItem('token');
let user              = JSON.parse(localStorage.getItem('user') || 'null');
let socket            = null;
let currentChatUserId = null;
const renderedIds     = new Set();

// URL helpers
const urlParams       = new URLSearchParams(window.location.search);
const resetToken      = urlParams.get('reset_token');   // e.g. ?reset_token=abc123
const verifyToken     = urlParams.get('verify_token'); // e.g. ?verify_token=abc123

// ─── DOM ──────────────────────────────────────────────────────────────────────
const authScreen      = document.getElementById('auth-screen');
const resetScreen     = document.getElementById('reset-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm       = document.getElementById('login-form');
const loginError      = document.getElementById('login-error');
const logoutBtn       = document.getElementById('logout-btn');
const targetInput     = document.getElementById('target-user-id');
const connectBtn      = document.getElementById('connect-chat-btn');
const chatError       = document.getElementById('chat-error');
const messagesList    = document.getElementById('messages-list');
const inputArea       = document.getElementById('message-input-area');
const messageInput    = document.getElementById('message-input');
const sendBtn         = document.getElementById('send-msg-btn');
const copyIdBtn       = document.getElementById('copy-id-btn');
const copyFeedback    = document.getElementById('copy-feedback');

// ─── DOM (Videos) ─────────────────────────────────────────────────────────────
const tabChat         = document.getElementById('tab-chat');
const tabVideos       = document.getElementById('tab-videos');
const chatView        = document.getElementById('chat-view');
const videosView      = document.getElementById('videos-view');
const videoForm       = document.getElementById('video-upload-form');
const videoStatus     = document.getElementById('vid-upload-status');
const videoFeed       = document.getElementById('video-feed-list');

// ─── Modal DOM ────────────────────────────────────────────────────────────────
const editModal       = document.getElementById('edit-video-modal');
const editForm        = document.getElementById('edit-video-form');
const editTitle       = document.getElementById('edit-vid-title');
const editDesc        = document.getElementById('edit-vid-desc');
const editPrivacy     = document.getElementById('edit-vid-privacy');
const editId          = document.getElementById('edit-vid-id');

// ─── Share Modal DOM ────────────────────────────────────────────────────────
const shareModal      = document.getElementById('share-video-modal');
const shareForm       = document.getElementById('share-video-form');
const shareTargetId   = document.getElementById('share-target-id');
const shareMsg        = document.getElementById('share-msg');
const shareVidId      = document.getElementById('share-vid-id');

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  // Priority 1: reset password flow (URL has ?reset_token=)
  if (resetToken) {
    showScreen('reset');
    return;
  }
  // Priority 2: email verification flow (URL has ?verify_token=)
  if (verifyToken) {
    handleVerifyEmail(verifyToken);
    return;
  }
  // Priority 3: already logged in
  if (token && user) { showDashboard(); connectSocket(); }
  else showAuth();
}

function showScreen(name) {
  authScreen.classList.remove('active');
  resetScreen.classList.remove('active');
  dashboardScreen.classList.remove('active');
  if (name === 'auth')      authScreen.classList.add('active');
  if (name === 'reset')     resetScreen.classList.add('active');
  if (name === 'dashboard') dashboardScreen.classList.add('active');
}

function showAuth() {
  showScreen('auth');
}

function showDashboard() {
  showScreen('dashboard');
  document.getElementById('my-role').textContent    = user.role;
  document.getElementById('my-id-full').textContent = user.id;
  document.getElementById('my-avatar').textContent  = user.role[0].toUpperCase();

  // Show email-not-verified banner if needed
  const banner = document.getElementById('verify-banner');
  if (banner) banner.style.display = user.emailVerified === false ? 'flex' : 'none';
}

// ─── Copy ID ──────────────────────────────────────────────────────────────────
copyIdBtn.addEventListener('click', () => {
  if (!user?.id) return;
  navigator.clipboard.writeText(user.id).then(() => {
    copyFeedback.textContent = '✓ Copied!';
    setTimeout(() => (copyFeedback.textContent = ''), 2000);
  }).catch(() => prompt('Copy your ID (Ctrl+C):', user.id));
});

// ─── Auth Tab Switching ───────────────────────────────────────────────────────
document.getElementById('tab-login').addEventListener('click', () => {
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-forgot').classList.remove('active');
  document.getElementById('login-panel').style.display = '';
  document.getElementById('forgot-panel').style.display = 'none';
});
document.getElementById('tab-forgot').addEventListener('click', () => {
  document.getElementById('tab-forgot').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('forgot-panel').style.display = '';
  document.getElementById('login-panel').style.display = 'none';
});

// ─── Login ────────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('login-btn');
  loginError.textContent = '';
  submitBtn.textContent  = 'Logging in…';
  submitBtn.disabled     = true;
  try {
    const res  = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      }),
    });
    const data = await res.json();
    if (data.success) {
      token = data.token;
      user  = data.user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      showDashboard();
      connectSocket();
    } else {
      loginError.textContent = data.message || 'Login failed';
      // Prompt user to verify if that's the issue
      if (data.message?.toLowerCase().includes('verif')) {
        loginError.innerHTML += '<br/><small style="color:#94a3b8">Check your inbox or use the Resend Verification option.</small>';
      }
    }
  } catch {
    loginError.textContent = 'Cannot reach server — is the backend running?';
  } finally {
    submitBtn.textContent = 'Login';
    submitBtn.disabled    = false;
  }
});

logoutBtn.addEventListener('click', () => {
  socket?.disconnect();
  localStorage.clear();
  token = user = socket = currentChatUserId = null;
  renderedIds.clear();
  showAuth();
});

// ─── Forgot Password ──────────────────────────────────────────────────────────
document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('forgot-btn');
  const msgEl = document.getElementById('forgot-msg');
  const email = document.getElementById('forgot-email').value.trim();

  btn.disabled = true;
  btn.textContent = 'Sending…';
  msgEl.style.color = 'var(--text-secondary)';
  msgEl.textContent = '';

  try {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    msgEl.style.color = 'var(--success-color)';
    msgEl.innerHTML = `✅ ${data.message}`;
  } catch {
    msgEl.style.color = 'var(--error-color)';
    msgEl.textContent = '❌ Cannot reach server.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
  }
});

// ─── Reset Password ───────────────────────────────────────────────────────────
document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn     = document.getElementById('reset-btn');
  const msgEl   = document.getElementById('reset-msg');
  const newPass = document.getElementById('new-password').value;
  const confirm = document.getElementById('confirm-password').value;

  if (newPass !== confirm) {
    msgEl.style.color = 'var(--error-color)';
    msgEl.textContent = '❌ Passwords do not match.';
    return;
  }
  if (newPass.length < 6) {
    msgEl.style.color = 'var(--error-color)';
    msgEl.textContent = '❌ Password must be at least 6 characters.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Resetting…';
  msgEl.textContent = '';

  try {
    const res = await fetch(`${API_URL}/auth/reset-password/${resetToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    });
    const data = await res.json();
    if (data.success) {
      token = data.token;
      user  = data.user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      msgEl.style.color = 'var(--success-color)';
      msgEl.textContent = '✅ Password reset! Taking you to the dashboard…';
      // Clean URL and go to dashboard
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
        showDashboard();
        connectSocket();
      }, 1500);
    } else {
      msgEl.style.color = 'var(--error-color)';
      msgEl.textContent = '❌ ' + (data.message || 'Reset failed. The link may have expired.');
    }
  } catch {
    msgEl.style.color = 'var(--error-color)';
    msgEl.textContent = '❌ Cannot reach server.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reset & Login';
  }
});

// ─── Email Verification via URL ───────────────────────────────────────────────
async function handleVerifyEmail(rawToken) {
  showAuth();
  const loginError = document.getElementById('login-error');
  loginError.style.color = 'var(--text-secondary)';
  loginError.textContent = '⏳ Verifying your email…';

  try {
    const res = await fetch(`${API_URL}/auth/verify-email/${rawToken}`);
    const data = await res.json();
    if (data.success) {
      loginError.style.color = 'var(--success-color)';
      loginError.textContent = '✅ ' + data.message + ' You can now log in.';
    } else {
      loginError.style.color = 'var(--error-color)';
      loginError.textContent = '❌ ' + (data.message || 'Verification failed.');
    }
  } catch {
    loginError.style.color = 'var(--error-color)';
    loginError.textContent = '❌ Cannot reach server.';
  }
  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);
}

// ─── Resend Verification ──────────────────────────────────────────────────────
document.getElementById('resend-verify-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('resend-verify-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const res = await fetch(`${API_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    });
    const data = await res.json();
    btn.textContent = data.success ? '✅ Sent!' : '❌ Failed';
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Resend'; }, 4000);
  } catch {
    btn.textContent = '❌ Error';
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Resend'; }, 3000);
  }
});

// ─── Socket ───────────────────────────────────────────────────────────────────
function connectSocket() {
  socket = io(SOCKET_URL, { auth: { token }, reconnection: true, reconnectionDelay: 1000 });

  socket.on('connect',           () => setOnline(true));
  socket.on('disconnect',        () => setOnline(false));
  socket.on('connection:success',() => setOnline(true));
  socket.on('connect_error', (err) => {
    console.error('[socket] connect_error:', err.message);
    if (['Authentication token is required','Not authorized','Authentication failed'].includes(err.message))
      logoutBtn.click();
  });

  // Incoming message from the other user
  socket.on('message:received', (msg) => {
    if (String(msg.senderId) === currentChatUserId) {
      appendMessage(msg);
      scrollDown();
    } else {
      showToast(String(msg.senderId), msg.content, () => openChat(String(msg.senderId)));
    }
  });

  // Real-time edit from the other user
  socket.on('message:edited', (msg) => {
    applyEdit(msg._id, msg.content);
  });

  // Real-time delete from the other user
  socket.on('message:deleted', ({ _id }) => {
    applyDelete(_id);
  });
}

function setOnline(online) {
  const dot = document.querySelector('.dot');
  if (!dot) return;
  dot.classList.toggle('online', online);
  const text = dot.nextSibling;
  if (text) text.textContent = online ? ' Connected' : ' Reconnecting…';
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(fromId, preview, onOpen) {
  document.getElementById('msg-toast')?.remove();
  const toast = document.createElement('div');
  toast.id        = 'msg-toast';
  toast.className = 'incoming-notif';
  toast.innerHTML = `
    <span>📩 New message from <strong>…${fromId.slice(-6)}</strong>: "${escapeHTML(preview.slice(0, 50))}"</span>
    <button id="toast-open-btn">Open Chat</button>
  `;
  document.querySelector('.chat-header').appendChild(toast);
  document.getElementById('toast-open-btn').onclick = () => { toast.remove(); onOpen(); };
  setTimeout(() => { if (document.getElementById('msg-toast')) { toast.remove(); onOpen(); } }, 2000);
}

// ─── Open / load conversation ─────────────────────────────────────────────────
function openChat(targetId) {
  targetInput.value     = targetId;
  currentChatUserId     = targetId;
  renderedIds.clear();
  chatError.textContent = '';
  inputArea.style.display = 'flex';
  messageInput.focus();
  messagesList.innerHTML = `<div class="empty-state"><span class="empty-icon">⏳</span><p>Loading…</p></div>`;

  socket.emit('conversation:history', { withUserId: targetId, limit: 50 }, (res) => {
    if (res?.success) renderHistory(res.data);
    else {
      chatError.textContent  = '⚠ ' + (res?.error ?? 'Failed to load history');
      messagesList.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Could not load messages.</p></div>`;
    }
  });
}

connectBtn.addEventListener('click', () => {
  const id = targetInput.value.trim();
  if (!id || id.length !== 24) { chatError.textContent = '⚠ Please paste a valid 24-character User ID.'; return; }
  openChat(id);
});

// ─── Render ───────────────────────────────────────────────────────────────────
function renderHistory(messages) {
  messagesList.innerHTML = '';
  renderedIds.clear();
  if (!messages?.length) {
    messagesList.innerHTML = `<div class="empty-state"><span class="empty-icon">👋</span><p>No messages yet. Say hello!</p></div>`;
    return;
  }
  messages.forEach(appendMessage);
  scrollDown();
}

function appendMessage(msg) {
  const id = String(msg._id);
  if (renderedIds.has(id)) return;
  renderedIds.add(id);

  document.querySelector('.empty-state')?.remove();

  const isMe = String(msg.senderId) === user.id;
  const el   = document.createElement('div');
  el.className  = `message ${isMe ? 'msg-sent' : 'msg-received'}`;
  el.dataset.id = id;

  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'now';

  // Embed shared video payload if it exists
  let sharedVideoHtml = '';
  if (msg.sharedVideo) {
    const v = msg.sharedVideo;
    sharedVideoHtml = `
      <div style="margin-top: 8px; margin-bottom: 4px; padding: 4px; background: rgba(0,0,0,0.1); border-radius: 10px;">
        <video controls style="max-height: 200px; width: 100%; border-radius: 8px;">
          <source src="${v.videoUrl}" type="video/mp4">
        </video>
        <div style="font-size: 0.8rem; font-weight: bold; margin-top: 6px; padding: 0 4px; color: var(--text-primary);">
          ▶️ ${escapeHTML(v.title || 'Attached Video')}
        </div>
      </div>
    `;
  }

  // Build inner HTML — action buttons only shown on sender's own messages
  el.innerHTML = `
    <span class="msg-body">${escapeHTML(msg.content)}</span>
    ${sharedVideoHtml}
    ${msg.edited ? '<span class="msg-edited">(edited)</span>' : ''}
    <span class="msg-time">${time}</span>
    ${isMe ? `
      <div class="msg-actions">
        <button class="action-btn edit-btn" data-id="${id}" title="Edit">✏️</button>
        <button class="action-btn delete-btn" data-id="${id}" title="Delete">🗑</button>
      </div>` : ''}
  `;

  // Bind edit/delete click handlers
  if (isMe) {
    el.querySelector('.edit-btn').addEventListener('click', () => startEdit(el, id, msg.content));
    el.querySelector('.delete-btn').addEventListener('click', () => deleteMessage(id, el));
  }

  messagesList.appendChild(el);
}

function scrollDown() { messagesList.scrollTop = messagesList.scrollHeight; }

// ─── Edit ─────────────────────────────────────────────────────────────────────
function startEdit(el, msgId, currentContent) {
  // Prevent double-edit
  if (el.querySelector('.edit-input-row')) return;

  const bodySpan = el.querySelector('.msg-body');
  bodySpan.style.display = 'none';

  const row = document.createElement('div');
  row.className = 'edit-input-row';
  row.innerHTML = `
    <input class="edit-input" type="text" value="${escapeAttr(currentContent)}">
    <div class="edit-actions">
      <button class="action-btn save-btn">✓ Save</button>
      <button class="action-btn cancel-btn">✕</button>
    </div>
  `;
  el.insertBefore(row, el.querySelector('.msg-time'));

  const input = row.querySelector('.edit-input');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  const cancelEdit = () => {
    row.remove();
    bodySpan.style.display = '';
  };

  row.querySelector('.cancel-btn').addEventListener('click', cancelEdit);
  row.querySelector('.save-btn').addEventListener('click', () => saveEdit(msgId, input.value, el, cancelEdit));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit(msgId, input.value, el, cancelEdit);
    if (e.key === 'Escape') cancelEdit();
  });
}

function saveEdit(msgId, newContent, el, cancelEdit) {
  const trimmed = newContent.trim();
  if (!trimmed) { chatError.textContent = '⚠ Message cannot be empty'; return; }

  socket.emit('message:edit', { messageId: msgId, newContent: trimmed }, (res) => {
    if (res?.success) {
      applyEdit(msgId, res.data.content, el);
      cancelEdit();
    } else {
      chatError.textContent = '⚠ ' + (res?.error ?? 'Edit failed');
      setTimeout(() => (chatError.textContent = ''), 3000);
    }
  });
}

// Apply an edit to a message bubble (own or incoming from socket event)
function applyEdit(msgId, newContent, existingEl) {
  const el = existingEl || messagesList.querySelector(`[data-id="${msgId}"]`);
  if (!el) return;
  const body = el.querySelector('.msg-body');
  if (body) body.textContent = newContent;

  // Add or show the (edited) label
  let editedTag = el.querySelector('.msg-edited');
  if (!editedTag) {
    editedTag = document.createElement('span');
    editedTag.className = 'msg-edited';
    editedTag.textContent = '(edited)';
    el.querySelector('.msg-time').before(editedTag);
  }
  editedTag.style.display = '';
}

// ─── Delete ───────────────────────────────────────────────────────────────────
function deleteMessage(msgId, el) {
  if (!confirm('Delete this message for everyone?')) return;

  socket.emit('message:delete', { messageId: msgId }, (res) => {
    if (res?.success) {
      applyDelete(msgId, el);
    } else {
      chatError.textContent = '⚠ ' + (res?.error ?? 'Delete failed');
      setTimeout(() => (chatError.textContent = ''), 3000);
    }
  });
}

// Remove a message bubble (own or incoming from socket event)
function applyDelete(msgId, existingEl) {
  const el = existingEl || messagesList.querySelector(`[data-id="${msgId}"]`);
  if (!el) return;

  el.classList.add('msg-deleting');
  setTimeout(() => {
    el.remove();
    renderedIds.delete(msgId);
    // If no messages left, show empty state
    if (!messagesList.querySelector('.message')) {
      messagesList.innerHTML = `<div class="empty-state"><span class="empty-icon">👋</span><p>No messages yet. Say hello!</p></div>`;
    }
  }, 300);
}

// ─── Send ─────────────────────────────────────────────────────────────────────
function sendMessage() {
  const content = messageInput.value.trim();
  if (!content || !currentChatUserId) return;
  if (!socket?.connected) { chatError.textContent = '⚠ Not connected. Please wait…'; return; }

  messageInput.disabled      = true;
  sendBtn.disabled           = true;
  messageInput.style.opacity = '0.5';

  socket.emit('message:send', { toUserId: currentChatUserId, content }, (res) => {
    messageInput.disabled      = false;
    sendBtn.disabled           = false;
    messageInput.style.opacity = '1';
    if (res?.success) {
      appendMessage(res.data);
      messageInput.value = '';
      scrollDown();
      messageInput.focus();
    } else {
      chatError.textContent = '⚠ ' + (res?.error ?? 'Network error');
      setTimeout(() => (chatError.textContent = ''), 4000);
    }
  });
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
tabChat.addEventListener('click', () => {
  tabChat.classList.add('active');
  tabVideos.classList.remove('active');
  chatView.style.display = 'flex';
  videosView.style.display = 'none';
});

tabVideos.addEventListener('click', () => {
  tabVideos.classList.add('active');
  tabChat.classList.remove('active');
  videosView.style.display = 'flex';
  chatView.style.display = 'none';
  loadVideoFeed();
});

// ─── VIDEOS LOGIC ─────────────────────────────────────────────────────────────
videoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('vid-upload-btn');
  const title = document.getElementById('vid-title').value;
  const desc = document.getElementById('vid-desc').value;
  const vType = document.getElementById('vid-type').value;
  const fileInput = document.getElementById('vid-file');

  if (!fileInput.files[0]) return;

  const formData = new FormData();
  formData.append('title', title);
  if (desc) formData.append('description', desc);
  formData.append('videoType', vType);
  formData.append('privacy', 'public'); 
  formData.append('video', fileInput.files[0]);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading to Cloudinary... (Please do not close)';
  videoStatus.textContent = '';
  videoStatus.style.color = 'var(--text-secondary)';

  try {
    const res = await fetch(`${API_URL}/videos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData 
    });
    
    const data = await res.json();
    if (data.success) {
      videoStatus.textContent = '✅ Video uploaded successfully!';
      videoStatus.style.color = 'var(--success-color)';
      videoForm.reset();
      loadVideoFeed(); // Refresh feed to see the new video
    } else {
      videoStatus.textContent = '❌ ' + (data.message || 'Upload failed');
      videoStatus.style.color = 'var(--error-color)';
    }
  } catch (err) {
    videoStatus.textContent = '❌ Cannot connect to server';
    videoStatus.style.color = 'var(--error-color)';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload to Cloudinary';
  }
});

async function loadVideoFeed() {
  if (!token) return;
  videoFeed.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><p>Loading feed...</p></div>';

  try {
    const res = await fetch(`${API_URL}/videos/feed`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.success) {
      if (data.count === 0) {
        videoFeed.innerHTML = `<div class="empty-state"><span class="empty-icon">📹</span><p>No videos available. Upload one!</p></div>`;
        return;
      }
      
      videoFeed.innerHTML = '';
      data.data.forEach(item => {
        // Video item from feed endpoint
        const v = item.video;
        const p = item.player;
        
        let actionsHtml = '';
        const isAcademyOwner = user.role === 'academy' && p && p.academy && p.academy._id === user.academyId;
        const isUploader = user.id === v.uploadedBy;
        const isAdmin = user.role === 'admin';
        
        if (isAdmin || isUploader || isAcademyOwner) {
          actionsHtml = `
            <div style="display:flex; gap: 8px;">
              <button class="action-btn edit-btn" style="border: 1px solid var(--border-color); padding: 6px;" onclick="openEditModal('${v._id}', '${escapeAttr(v.title || '')}', '${escapeAttr(v.description || '')}', '${escapeAttr(v.privacy || 'public')}')">✏️ Edit</button>
              <button class="action-btn delete-btn" style="border: 1px solid var(--border-color); padding: 6px;" onclick="deleteVideo('${v._id}')">🗑 Delete</button>
            </div>
          `;
        }

        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
          <div class="video-header">
            <div>
              <div class="video-title">${escapeHTML(v.title)}</div>
              <div class="video-meta">
                ${p ? escapeHTML(p.fullName) : 'Academy Match'} • Privacy: ${v.privacy} • <span id="view-count-${v._id}">${v.views || 0}</span> views
                • <span id="like-count-${v._id}">${v.likes?.length || 0}</span> likes
              </div>
            </div>
            <!-- Actions -->
            <div style="display:flex; align-items: center;">
              <button class="action-btn like-btn ${v.likes?.includes(user.id) ? 'liked' : ''}" style="margin-right: 6px; font-size: 1.1rem; background: none; border: none; cursor: pointer; color: ${v.likes?.includes(user.id) ? 'var(--primary-color)' : 'var(--text-secondary)'};" onclick="toggleLike('${v._id}', this)">❤️</button>
              ${actionsHtml}
              <button class="action-btn share-btn" style="border: 1px solid var(--border-color); padding: 6px; margin-left: 6px;" onclick="openShareModal('${v._id}')">↗️ Share</button>
            </div>
          </div>
          <video class="video-player" controls preload="metadata" onplay="recordView(this, '${v._id}')">
            <source src="${v.videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <!-- Comments Section -->
          <div class="comments-section" id="comments-${v._id}" style="padding: 10px; border-top: 1px solid var(--border-color);">
            <button class="load-comments-btn" onclick="loadComments('${v._id}')" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0;">Load Comments</button>
            <div class="comments-list" id="comments-list-${v._id}" style="display:none; margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>
            <div class="comment-input-area" id="comment-input-area-${v._id}" style="display:none; margin-top: 10px; gap: 8px;">
              <input type="text" id="comment-input-${v._id}" placeholder="Write a comment..." style="flex:1; padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary);">
              <button onclick="addComment('${v._id}')" style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">Post</button>
            </div>
          </div>
        `;
        videoFeed.appendChild(card);
      });
    }
  } catch (err) {
    videoFeed.innerHTML = `<div class="empty-state"><p style="color:var(--error-color)">Error loading feed</p></div>`;
  }
}

window.deleteVideo = async (videoId) => {
  if (!confirm('Are you sure you want to permanently delete this video from Cloudinary?')) return;
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      alert('Video deleted successfully.');
      loadVideoFeed();
    } else {
      alert('Failed: ' + (data.message || 'Unauthorized'));
    }
  } catch (err) {
    alert('Server error.');
  }
};

window.openEditModal = (id, title, desc, privacy) => {
  editId.value = id;
  editTitle.value = title;
  editDesc.value = desc;
  editPrivacy.value = privacy;
  editModal.style.display = 'flex';
};

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById('save-edit-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  try {
    const res = await fetch(`${API_URL}/videos/${editId.value}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: editTitle.value,
        description: editDesc.value,
        privacy: editPrivacy.value
      })
    });
    const data = await res.json();
    if (data.success) {
      editModal.style.display = 'none';
      loadVideoFeed(); // reload UI
    } else {
      alert('Update failed: ' + (data.message || 'Unauthorized'));
    }
  } catch (err) {
    alert('Server error updates.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
});

// ─── SHARE LOGIC ─────────────────────────────────────────────────────────────
window.openShareModal = (id) => {
  shareVidId.value = id;
  // If the user already has a chat opened, pre-fill it for convenience!
  shareTargetId.value = currentChatUserId || ''; 
  shareMsg.value = '';
  shareModal.style.display = 'flex';
};

shareForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const toUserId = shareTargetId.value.trim();
  const content = shareMsg.value.trim(); // Allowed to be entirely empty now due to backend fix
  const svId = shareVidId.value;

  if (!toUserId || toUserId.length !== 24) { 
    alert('You must provide a valid 24-character Scout ID.'); 
    return; 
  }
  if (!socket?.connected) { 
    alert('Websocket disconnected. Please reconnect.'); 
    return; 
  }

  const submitBtn = document.getElementById('send-share-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  socket.emit('message:send', { toUserId, content, sharedVideo: svId }, (res) => {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send to Chat';
    if (res?.success) {
      alert('Video Shared successfully!');
      shareModal.style.display = 'none';
      // If we are currently staring at the same chat we shared it to, append it instantly
      if (currentChatUserId === toUserId) {
         appendMessage(res.data);
         scrollDown();
      } else {
         // Optionally prompt them to switch tabs
         if (confirm('Video sent! Switch to Chat to view it?')) {
            tabChat.click();
            openChat(toUserId);
         }
      }
    } else {
      alert('Share Failed: ' + (res?.error ?? 'Network error'));
    }
  });
});

// ─── VIEW TRACKING LOGIC ──────────────────────────────────────────────────────
window.recordView = async (videoEl, videoId) => {
  // Only record the view once per video session to prevent spamming from pause/play toggles
  if (videoEl.dataset.viewed === 'true') return;
  videoEl.dataset.viewed = 'true';

  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/view`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success && data.data && data.data.views) {
      // Dynamically update the UI counter in real-time
      const viewEl = document.getElementById(`view-count-${videoId}`);
      if (viewEl) {
        viewEl.textContent = data.data.views;
      }
    }
  } catch (err) {
    console.error('Failed to increment view tracking:', err);
  }
};

// ─── LIKE & COMMENT LOGIC ─────────────────────────────────────────────────────
window.toggleLike = async (videoId, btnEl) => {
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const isLiked = data.message === 'Video liked';
      const likeCountEl = document.getElementById(`like-count-${videoId}`);
      if (likeCountEl) likeCountEl.textContent = data.data.likesCount;
      
      btnEl.classList.toggle('liked', isLiked);
      btnEl.style.color = isLiked ? 'var(--primary-color)' : 'var(--text-secondary)';
    }
  } catch (err) {
    console.error('Like error:', err);
  }
};

window.loadComments = async (videoId) => {
  const listEl = document.getElementById(`comments-list-${videoId}`);
  const inputAreaEl = document.getElementById(`comment-input-area-${videoId}`);
  const loadBtnEl = document.querySelector(`#comments-${videoId} .load-comments-btn`);
  
  if (listEl.style.display === 'block') {
    // Toggle off
    listEl.style.display = 'none';
    inputAreaEl.style.display = 'none';
    loadBtnEl.textContent = 'Load Comments';
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/comments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      listEl.innerHTML = '';
      if (data.count === 0) {
        listEl.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.9rem; padding: 5px 0;">No comments yet.</div>';
      } else {
        data.data.forEach(c => {
          listEl.innerHTML += renderCommentHtml(c, videoId);
        });
      }
      listEl.style.display = 'block';
      inputAreaEl.style.display = 'flex';
      loadBtnEl.textContent = 'Hide Comments';
    }
  } catch (err) {
    console.error('Comments load error:', err);
  }
};

window.addComment = async (videoId, parentCommentId = null) => {
  const inputEl = document.getElementById(parentCommentId ? `reply-input-${parentCommentId}` : `comment-input-${videoId}`);
  const text = inputEl.value.trim();
  if (!text) return;
  
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/comments`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, parentComment: parentCommentId })
    });
    const data = await res.json();
    if (data.success) {
      inputEl.value = '';
      if (parentCommentId) {
        const replyArea = document.getElementById(`reply-input-area-${parentCommentId}`);
        if (replyArea) replyArea.style.display = 'none';
      }
      // Reload comments to show the new one
      const listEl = document.getElementById(`comments-list-${videoId}`);
      listEl.style.display = 'none'; // force toggle
      await loadComments(videoId);
    } else {
      alert(data.message || 'Error posting comment');
    }
  } catch (err) {
    console.error('Comment error:', err);
  }
};

window.showReplyInput = (commentId) => {
  const replyArea = document.getElementById(`reply-input-area-${commentId}`);
  if (replyArea) {
    replyArea.style.display = replyArea.style.display === 'none' ? 'flex' : 'none';
  }
};

window.toggleCommentLike = async (videoId, commentId, btnEl) => {
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const isLiked = data.message === 'Comment liked';
      const likeCountEl = document.getElementById(`comment-like-count-${commentId}`);
      if (likeCountEl) likeCountEl.textContent = data.data.likesCount;
      
      btnEl.style.color = isLiked ? 'var(--primary-color)' : 'var(--text-secondary)';
    }
  } catch (err) {
    console.error('Comment like error:', err);
  }
};

window.deleteComment = async (videoId, commentId) => {
  if (!confirm('Delete this comment?')) return;
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const commentEl = document.getElementById(`comment-${commentId}`);
      if (commentEl) commentEl.remove();
    } else {
      alert(data.message || 'Error deleting comment');
    }
  } catch (err) {
    console.error('Delete comment error:', err);
  }
};

function renderCommentHtml(c, videoId, isReply = false) {
  const canDelete = user.role === 'admin' || user.id === String(c.user._id);
  const time = new Date(c.createdAt).toLocaleDateString();
  const likesCount = c.likes ? c.likes.length : 0;
  const isLiked = c.likes ? c.likes.includes(user.id) : false;
  
  let html = `
    <div id="comment-${c._id}" style="padding: 8px; border-bottom: ${isReply ? 'none' : '1px solid var(--bg-hover)'}; margin-left: ${isReply ? '20px' : '0'}; border-left: ${isReply ? '2px solid var(--bg-hover)' : 'none'}; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="font-weight: bold; font-size: 0.9rem; color: var(--text-primary);">
            ${escapeHTML(c.user.fullName)} <span style="font-weight: normal; font-size: 0.8rem; color: var(--text-secondary); margin-left: 5px;">${time}</span>
          </div>
          <div style="font-size: 0.95rem; margin-top: 4px; color: var(--text-primary); word-break: break-word;">
            ${escapeHTML(c.text)}
          </div>
          
          <!-- Actions: Like & Reply -->
          <div style="margin-top: 6px; display: flex; gap: 12px; align-items: center; font-size: 0.85rem;">
            <button onclick="toggleCommentLike('${videoId}', '${c._id}', this)" style="background: none; border: none; cursor: pointer; color: ${isLiked ? 'var(--primary-color)' : 'var(--text-secondary)'}; padding: 0;">❤️ <span id="comment-like-count-${c._id}">${likesCount}</span></button>
            ${!isReply ? `<button onclick="showReplyInput('${c._id}')" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 0;">Reply</button>` : ''}
            ${canDelete ? `<button onclick="deleteComment('${videoId}', '${c._id}')" style="background: none; border: none; cursor: pointer; color: var(--error-color); padding: 0;">Delete</button>` : ''}
          </div>

          <!-- Reply Input Area -->
          ${!isReply ? `
          <div class="comment-input-area" id="reply-input-area-${c._id}" style="display:none; margin-top: 8px; gap: 8px; margin-left: 20px;">
            <input type="text" id="reply-input-${c._id}" placeholder="Write a reply..." style="flex:1; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.9rem;">
            <button onclick="addComment('${videoId}', '${c._id}')" style="padding: 6px 12px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Reply</button>
          </div>
          ` : ''}

        </div>
      </div>
  `;

  // Render Replies
  if (c.replies && c.replies.length > 0) {
    html += `<div style="margin-top: 8px;">`;
    c.replies.forEach(reply => {
      html += renderCommentHtml(reply, videoId, true);
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

init();
