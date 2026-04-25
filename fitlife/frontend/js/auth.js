// frontend/js/auth.js
// Handles login and registration logic

import {
  apiFetch,
  saveAuth,
  redirectIfAuth,
  showAlert,
  clearAlert,
  showFieldError,
  clearFieldErrors,
  setLoading,
} from './main.js';

// Redirect if already logged in
redirectIfAuth();

// ── Determine which page we're on ────────────────────────────
const isLogin = !!document.getElementById('loginForm');
const isRegister = !!document.getElementById('registerForm');

// ── LOGIN ─────────────────────────────────────────────────────
if (isLogin) {
  const loginForm = document.getElementById('loginForm');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert('alertBox');
    clearFieldErrors(['email', 'password']);

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Client-side validation
    let valid = true;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('email', 'Please enter a valid email address');
      valid = false;
    }

    if (!password) {
      showFieldError('password', 'Password is required');
      valid = false;
    }

    if (!valid) return;

    setLoading('loginBtn', true, 'Signing in...');

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      saveAuth(data);
      showAlert('alertBox', 'Login successful! Redirecting...', 'success');

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (error) {
      showAlert('alertBox', error.message || 'Login failed. Please try again.');
      setLoading('loginBtn', false, 'Sign In');
    }
  });
}

// ── REGISTER ──────────────────────────────────────────────────
if (isRegister) {
  const registerForm = document.getElementById('registerForm');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert('alertBox');
    clearFieldErrors(['name', 'email', 'password']);

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const age = document.getElementById('age').value;
    const goal = document.getElementById('goal').value;

    // Client-side validation
    let valid = true;

    if (!name || name.length < 2) {
      showFieldError('name', 'Name must be at least 2 characters');
      valid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('email', 'Please enter a valid email address');
      valid = false;
    }

    if (!password || password.length < 6) {
      showFieldError('password', 'Password must be at least 6 characters');
      valid = false;
    }

    if (!valid) return;

    setLoading('registerBtn', true, 'Creating account...');

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, age: age || undefined, goal: goal || undefined }),
      });

      saveAuth(data);
      showAlert('alertBox', 'Account created! Taking you to your dashboard...', 'success');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 900);
    } catch (error) {
      showAlert('alertBox', error.message || 'Registration failed. Please try again.');
      setLoading('registerBtn', false, 'Create Account');
    }
  });
}
