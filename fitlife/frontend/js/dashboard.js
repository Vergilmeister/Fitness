// frontend/js/dashboard.js
// Dashboard: Stats, Workout CRUD, Pagination

import {
  apiFetch,
  getUser,
  requireAuth,
  showAlert,
  clearAlert,
  showFieldError,
  clearFieldErrors,
  setLoading,
  formatDate,
  getGreeting,
} from './main.js';

// Guard: must be logged in
if (!requireAuth()) throw new Error('Not authenticated');

// ── State ─────────────────────────────────────────────────────
let currentPage = 1;
const LIMIT = 5;
let editingId = null; // null = adding, string = editing

// ── DOM References ────────────────────────────────────────────
const workoutList   = document.getElementById('workoutList');
const pagination    = document.getElementById('pagination');
const modal         = document.getElementById('workoutModal');
const modalTitle    = document.getElementById('modalTitle');
const workoutForm   = document.getElementById('workoutForm');
const addWorkoutBtn = document.getElementById('addWorkoutBtn');
const modalClose    = document.getElementById('modalClose');
const cancelBtn     = document.getElementById('cancelBtn');

// ── Init ──────────────────────────────────────────────────────
(async () => {
  // Set greeting and user name
  const user = getUser();
  document.getElementById('timeGreet').textContent = getGreeting();
  document.getElementById('userName').textContent = user?.name?.split(' ')[0] || 'Athlete';
  if (document.getElementById('navUser')) {
    document.getElementById('navUser').textContent = user?.name || '';
  }

  // Set default date in modal to today
  document.getElementById('wDate').valueAsDate = new Date();

  await Promise.all([loadStats(), loadWorkouts()]);
})();

// ── Load Stats ────────────────────────────────────────────────
async function loadStats() {
  try {
    const stats = await apiFetch('/workouts/stats');
    document.getElementById('statSessions').textContent = stats.totalSessions;
    document.getElementById('statCalories').textContent = stats.totalCalories.toLocaleString();
    document.getElementById('statDuration').textContent = stats.totalDuration;
  } catch (_) {
    // Non-critical, silently fail
  }
}

// ── Load Workouts (with pagination) ──────────────────────────
async function loadWorkouts(page = 1) {
  workoutList.innerHTML = '<div class="page-loader"><div class="loader"></div></div>';

  try {
    const data = await apiFetch(`/workouts?page=${page}&limit=${LIMIT}`);
    currentPage = data.page;
    renderWorkouts(data.workouts);
    renderPagination(data.page, data.totalPages);
  } catch (error) {
    workoutList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>${error.message}</p>
      </div>`;
  }
}

// ── Render Workout Cards ──────────────────────────────────────
function renderWorkouts(workouts) {
  if (!workouts || workouts.length === 0) {
    workoutList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏋️</div>
        <h3>No workouts yet</h3>
        <p>Click "Add Workout" to log your first session!</p>
      </div>`;
    return;
  }

  workoutList.innerHTML = workouts
    .map(
      (w) => `
      <div class="workout-item fade-in" data-id="${w._id}">
        <div>
          <span class="workout-type-badge">${w.type}</span>
        </div>
        <div class="workout-info">
          <div class="workout-title">${escapeHtml(w.title)}</div>
          <div class="workout-meta">
            📅 ${formatDate(w.date)} &nbsp;·&nbsp;
            ⏱️ ${w.duration} min &nbsp;·&nbsp;
            🔥 ${w.calories} kcal
            ${w.notes ? `&nbsp;·&nbsp; 📝 ${escapeHtml(w.notes.substring(0, 40))}${w.notes.length > 40 ? '…' : ''}` : ''}
          </div>
        </div>
        <div class="workout-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEdit('${w._id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteWorkout('${w._id}')">🗑️</button>
        </div>
      </div>`
    )
    .join('');
}

// ── Render Pagination ─────────────────────────────────────────
function renderPagination(page, totalPages) {
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }

  let html = `
    <button ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">‹</button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }

  html += `<button ${page === totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">›</button>`;
  pagination.innerHTML = html;
}

// Global page change (called from inline onclick)
window.changePage = (page) => {
  loadWorkouts(page);
};

// ── Modal: Open for Add ───────────────────────────────────────
addWorkoutBtn.addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Add Workout';
  workoutForm.reset();
  document.getElementById('wDate').valueAsDate = new Date();
  document.getElementById('workoutId').value = '';
  clearFieldErrors(['wTitle', 'wType', 'wDuration', 'wCalories']);
  clearAlert('alertBox');
  openModal();
});

// ── Modal: Open for Edit ──────────────────────────────────────
window.openEdit = async (id) => {
  try {
    // Fetch the single workout by scanning current page data (already loaded)
    // Re-fetch all workouts on this page to get the workout object
    const data = await apiFetch(`/workouts?page=${currentPage}&limit=${LIMIT}`);
    const workout = data.workouts.find((w) => w._id === id);
    if (!workout) return;

    editingId = id;
    modalTitle.textContent = 'Edit Workout';
    document.getElementById('workoutId').value = id;
    document.getElementById('wTitle').value = workout.title;
    document.getElementById('wType').value = workout.type;
    document.getElementById('wDuration').value = workout.duration;
    document.getElementById('wCalories').value = workout.calories;
    document.getElementById('wNotes').value = workout.notes || '';
    document.getElementById('wDate').value = workout.date.slice(0, 10);
    clearFieldErrors(['wTitle', 'wType', 'wDuration', 'wCalories']);
    clearAlert('alertBox');
    openModal();
  } catch (error) {
    showAlert('alertBox', 'Could not load workout details.');
  }
};

// ── Delete Workout ────────────────────────────────────────────
window.deleteWorkout = async (id) => {
  if (!confirm('Delete this workout?')) return;
  try {
    await apiFetch(`/workouts/${id}`, { method: 'DELETE' });
    showAlert('alertBox', 'Workout deleted.', 'success');
    await Promise.all([loadStats(), loadWorkouts(currentPage)]);
  } catch (error) {
    showAlert('alertBox', error.message);
  }
};

// ── Save Workout (Add or Edit) ────────────────────────────────
workoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(['wTitle', 'wType', 'wDuration', 'wCalories']);

  const title    = document.getElementById('wTitle').value.trim();
  const type     = document.getElementById('wType').value;
  const duration = parseInt(document.getElementById('wDuration').value);
  const calories = parseInt(document.getElementById('wCalories').value);
  const notes    = document.getElementById('wNotes').value.trim();
  const date     = document.getElementById('wDate').value;

  // Client-side validation
  let valid = true;
  if (!title) { showFieldError('wTitle', 'Title is required'); valid = false; }
  if (!type) { showFieldError('wType', 'Please select a type'); valid = false; }
  if (!duration || duration < 1) { showFieldError('wDuration', 'Enter a valid duration'); valid = false; }
  if (isNaN(calories) || calories < 0) { showFieldError('wCalories', 'Enter a valid calorie count'); valid = false; }
  if (!valid) return;

  const payload = { title, type, duration, calories, notes, date };
  const isEdit = !!editingId;

  setLoading('saveWorkoutBtn', true, isEdit ? 'Updating...' : 'Saving...');

  try {
    if (isEdit) {
      await apiFetch(`/workouts/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showAlert('alertBox', 'Workout updated!', 'success');
    } else {
      await apiFetch('/workouts', { method: 'POST', body: JSON.stringify(payload) });
      showAlert('alertBox', 'Workout added!', 'success');
    }

    closeModal();
    await Promise.all([loadStats(), loadWorkouts(currentPage)]);
  } catch (error) {
    setLoading('saveWorkoutBtn', false, isEdit ? 'Update Workout' : 'Save Workout');
    showAlert('alertBox', error.message);
  }
});

// ── Modal Helpers ─────────────────────────────────────────────
function openModal() {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
  workoutForm.reset();
  editingId = null;
  document.getElementById('saveWorkoutBtn').innerHTML = 'Save Workout';
  document.getElementById('saveWorkoutBtn').disabled = false;
}

modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

// Close modal on overlay click
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Utility ───────────────────────────────────────────────────
function escapeHtml(str) {
  const el = document.createElement('div');
  el.appendChild(document.createTextNode(str));
  return el.innerHTML;
}
