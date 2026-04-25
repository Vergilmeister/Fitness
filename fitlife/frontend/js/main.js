// frontend/js/main.js
// Shared utility functions used across all pages

const API_BASE = '/api';

/**
 * Get JWT token from localStorage
 */
export const getToken = () => localStorage.getItem('fitlife_token');

/**
 * Get stored user object from localStorage
 */
export const getUser = () => {
  const u = localStorage.getItem('fitlife_user');
  return u ? JSON.parse(u) : null;
};

/**
 * Save auth data to localStorage
 */
export const saveAuth = (data) => {
  localStorage.setItem('fitlife_token', data.token);
  localStorage.setItem('fitlife_user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
};

/**
 * Redirect to login if not authenticated
 */
export const requireAuth = () => {
  if (!getToken()) {
    window.location.href = '/login';
    return false;
  }
  return true;
};

/**
 * Redirect to dashboard if already authenticated
 */
export const redirectIfAuth = () => {
  if (getToken()) {
    window.location.href = '/dashboard';
  }
};

/**
 * Generic authenticated fetch wrapper
 * @param {string} endpoint - API path (e.g. '/workouts')
 * @param {object} options  - fetch options
 */
export const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // Surface the first validation error or message
    const msg =
      data.message ||
      (data.errors && data.errors[0]?.msg) ||
      'Something went wrong';
    throw new Error(msg);
  }

  return data;
};

/**
 * Show an alert inside a container element
 * @param {string} containerId - ID of the element to render alert into
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export const showAlert = (containerId, message, type = 'error') => {
  const el = document.getElementById(containerId);
  if (!el) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.innerHTML = `
    <div class="alert alert-${type}">
      <span>${icons[type]}</span> ${message}
    </div>`;
  // Auto-clear success alerts after 4 seconds
  if (type === 'success') {
    setTimeout(() => { el.innerHTML = ''; }, 4000);
  }
};

/**
 * Clear an alert container
 */
export const clearAlert = (containerId) => {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
};

/**
 * Show a field-level validation error
 */
export const showFieldError = (fieldId, message) => {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}Error`);
  if (field) field.classList.add('error');
  if (error) {
    error.textContent = message;
    error.classList.remove('hidden');
  }
};

/**
 * Clear all field errors in a form
 */
export const clearFieldErrors = (fieldIds) => {
  fieldIds.forEach((id) => {
    const field = document.getElementById(id);
    const error = document.getElementById(`${id}Error`);
    if (field) field.classList.remove('error');
    if (error) {
      error.textContent = '';
      error.classList.add('hidden');
    }
  });
};

/**
 * Set a button to loading state
 */
export const setLoading = (btnId, loading, text = 'Loading...') => {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${text}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || text;
    btn.disabled = false;
  }
};

/**
 * Format a date string nicely
 */
export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Get greeting based on time of day
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};
