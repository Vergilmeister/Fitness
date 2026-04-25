// frontend/js/chat.js
// Real-time chat using Socket.IO

import { getUser, getToken } from './main.js';

// ── State ─────────────────────────────────────────────────────
let socket = null;
let currentRoom = 'general';
let username = '';
let typingTimer = null;

// ── DOM ───────────────────────────────────────────────────────
const joinScreen    = document.getElementById('joinScreen');
const chatScreen    = document.getElementById('chatScreen');
const joinBtn       = document.getElementById('joinBtn');
const joinNameInput = document.getElementById('joinName');
const joinRoomSel   = document.getElementById('joinRoom');
const joinNameError = document.getElementById('joinNameError');

const chatMessages    = document.getElementById('chatMessages');
const messageInput    = document.getElementById('messageInput');
const sendBtn         = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const onlineBadge     = document.getElementById('onlineBadge');
const chatRoomName    = document.getElementById('chatRoomName');
const sidebarUsername = document.getElementById('sidebarUsername');
const roomBtns        = document.querySelectorAll('.room-btn');

// Pre-fill username from stored user if available
const storedUser = getUser();
if (storedUser && joinNameInput) {
  joinNameInput.value = storedUser.name || '';
}

// ── Room labels ───────────────────────────────────────────────
const roomLabels = {
  general:    '💬 General',
  workouts:   '🏋️ Workouts',
  nutrition:  '🥗 Nutrition',
  motivation: '🔥 Motivation',
  beginners:  '🌱 Beginners',
};

// ── Join Chat ─────────────────────────────────────────────────
joinBtn.addEventListener('click', () => {
  const name = joinNameInput.value.trim();
  const room = joinRoomSel.value;

  // Validate
  if (!name || name.length < 2) {
    joinNameError.textContent = 'Enter a nickname (min. 2 characters)';
    joinNameError.classList.remove('hidden');
    joinNameInput.classList.add('error');
    return;
  }

  joinNameError.classList.add('hidden');
  joinNameInput.classList.remove('error');

  username = name;
  currentRoom = room;

  // Show chat, hide join screen
  joinScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  sidebarUsername.textContent = username;
  updateRoomUI(room);

  // Connect Socket.IO
  connectSocket();
});

// ── Connect Socket ────────────────────────────────────────────
function connectSocket() {
  // Connect to the same origin
  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    // Emit join event
    socket.emit('join_room', { username, room: currentRoom });
    appendSystemMessage(`You joined ${roomLabels[currentRoom]}`);
  });

  socket.on('disconnect', () => {
    appendSystemMessage('Disconnected from server. Reconnecting...');
  });

  // Another user joined
  socket.on('user_joined', ({ message, time }) => {
    appendSystemMessage(message);
  });

  // Another user left
  socket.on('user_left', ({ message }) => {
    appendSystemMessage(message);
  });

  // Receive a message
  socket.on('receive_message', ({ username: sender, message, time, id }) => {
    const isOwn = id === socket.id;
    appendMessage(sender, message, time, isOwn);
  });

  // Online users count
  socket.on('room_users', (count) => {
    onlineBadge.textContent = `${count} online`;
  });

  // Typing indicators
  socket.on('user_typing', (typingUser) => {
    typingIndicator.textContent = `${typingUser} is typing...`;
  });

  socket.on('stop_typing', () => {
    typingIndicator.textContent = '';
  });
}

// ── Send Message ──────────────────────────────────────────────
function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || !socket) return;

  socket.emit('send_message', { username, message, room: currentRoom });
  messageInput.value = '';
  messageInput.style.height = 'auto';

  // Stop typing
  socket.emit('stop_typing', { room: currentRoom });
  clearTimeout(typingTimer);
}

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  // Send on Enter (not Shift+Enter)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';

  // Typing indicator
  if (socket) {
    socket.emit('typing', { username, room: currentRoom });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit('stop_typing', { room: currentRoom });
    }, 1500);
  }
});

// ── Switch Room ───────────────────────────────────────────────
roomBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const newRoom = btn.dataset.room;
    if (newRoom === currentRoom) return;

    // Leave old room
    if (socket) {
      socket.emit('stop_typing', { room: currentRoom });
    }

    currentRoom = newRoom;
    updateRoomUI(newRoom);
    clearMessages();

    // Rejoin with new room
    if (socket) {
      socket.emit('join_room', { username, room: newRoom });
      appendSystemMessage(`You joined ${roomLabels[newRoom]}`);
    }
  });
});

// ── Render Helpers ─────────────────────────────────────────────
function appendMessage(sender, message, time, isOwn) {
  const div = document.createElement('div');
  div.className = `chat-bubble ${isOwn ? 'own' : 'other'}`;
  div.innerHTML = `
    <div class="bubble-content">${escapeHtml(message)}</div>
    <div class="bubble-meta">${isOwn ? '' : `<strong>${escapeHtml(sender)}</strong> · `}${time}</div>`;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function appendSystemMessage(message) {
  const div = document.createElement('div');
  div.className = 'chat-bubble system';
  div.innerHTML = `<div class="bubble-content">${escapeHtml(message)}</div>`;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function clearMessages() {
  chatMessages.innerHTML = '';
  typingIndicator.textContent = '';
  onlineBadge.textContent = '0 online';
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateRoomUI(room) {
  chatRoomName.textContent = roomLabels[room] || room;
  roomBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.room === room);
  });
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.appendChild(document.createTextNode(str || ''));
  return el.innerHTML;
}
