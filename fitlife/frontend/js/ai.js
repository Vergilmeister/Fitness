// frontend/js/ai.js
// AI Coach page: form submission, results display, history

import {
  apiFetch,
  requireAuth,
  showAlert,
  clearAlert,
  showFieldError,
  clearFieldErrors,
  setLoading,
  formatDate,
} from './main.js';

// Guard
if (!requireAuth()) throw new Error('Not authenticated');

// ── DOM ───────────────────────────────────────────────────────
const aiForm     = document.getElementById('aiForm');
const aiResult   = document.getElementById('aiResult');
const historyList = document.getElementById('historyList');

// ── Init ──────────────────────────────────────────────────────
(async () => {
  await loadHistory();
})();

// ── Generate AI Plan ──────────────────────────────────────────
aiForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert('alertBox');
  clearFieldErrors(['aiGoal', 'aiAge', 'aiActivity']);

  const goal     = document.getElementById('aiGoal').value;
  const age      = parseInt(document.getElementById('aiAge').value);
  const activity = document.getElementById('aiActivity').value;

  // Client-side validation
  let valid = true;
  if (!goal) { showFieldError('aiGoal', 'Please select your fitness goal'); valid = false; }
  if (!age || age < 10 || age > 100) { showFieldError('aiAge', 'Please enter your age (10–100)'); valid = false; }
  if (!activity) { showFieldError('aiActivity', 'Please select your activity level'); valid = false; }
  if (!valid) return;

  setLoading('aiBtn', true, 'Generating your plan...');

  // Hide old result while generating
  aiResult.classList.remove('active');

  try {
    const data = await apiFetch('/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ goal, age, activityLevel: activity }),
    });

    // Populate result
    document.getElementById('workoutPlan').textContent = data.workoutPlan;
    document.getElementById('dietPlan').textContent = data.dietPlan;
    document.getElementById('planDate').textContent = formatDate(data.createdAt);

    // Show result panel
    aiResult.classList.add('active');
    aiResult.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Reload history
    await loadHistory();
  } catch (error) {
    showAlert('alertBox', error.message || 'Could not generate a plan. Please try again.');
  } finally {
    setLoading('aiBtn', false, 'Generate My Plan');
  }
});

// ── Load History ──────────────────────────────────────────────
async function loadHistory() {
  historyList.innerHTML = '<div class="page-loader"><div class="loader"></div></div>';

  try {
    const suggestions = await apiFetch('/ai/history');

    if (!suggestions || suggestions.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🤖</div>
          <h3>No plans yet</h3>
          <p>Generate your first AI plan above!</p>
        </div>`;
      return;
    }

    historyList.innerHTML = suggestions
      .map(
        (s) => `
        <div class="workout-item fade-in" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
          <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
            <div>
              <span class="workout-type-badge">${formatGoal(s.goal)}</span>
            </div>
            <span style="font-size:0.8rem; color:var(--slate-400);">${formatDate(s.createdAt)}</span>
          </div>
          <div class="workout-meta">
            Age: ${s.age} &nbsp;·&nbsp; Activity: ${capitalise(s.activityLevel)}
          </div>
          <details style="width:100%; margin-top:0.25rem;">
            <summary style="cursor:pointer; font-size:0.85rem; color:var(--accent); font-weight:600;">
              View Plan
            </summary>
            <div style="margin-top:0.75rem; display:grid; gap:0.75rem;">
              <div>
                <strong style="font-size:0.82rem; color:var(--slate-600);">💪 Workout Plan</strong>
                <pre style="white-space:pre-wrap; font-family:inherit; font-size:0.82rem; line-height:1.6;
                  background:var(--slate-50); padding:0.75rem; border-radius:8px; margin-top:0.35rem;
                  color:var(--slate-700);">${escapeHtml(s.workoutPlan)}</pre>
              </div>
              <div>
                <strong style="font-size:0.82rem; color:var(--slate-600);">🥗 Diet Plan</strong>
                <pre style="white-space:pre-wrap; font-family:inherit; font-size:0.82rem; line-height:1.6;
                  background:var(--slate-50); padding:0.75rem; border-radius:8px; margin-top:0.35rem;
                  color:var(--slate-700);">${escapeHtml(s.dietPlan)}</pre>
              </div>
            </div>
          </details>
        </div>`
      )
      .join('');
  } catch (error) {
    historyList.innerHTML = `<p style="color:var(--slate-500); padding:1rem;">Could not load history.</p>`;
  }
}

// ── Helpers ───────────────────────────────────────────────────
function formatGoal(goal) {
  const map = {
    lose_weight: '🏃 Lose Weight',
    build_muscle: '💪 Build Muscle',
    improve_endurance: '🏅 Endurance',
    stay_healthy: '🌿 Stay Healthy',
  };
  return map[goal] || goal;
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.appendChild(document.createTextNode(str || ''));
  return el.innerHTML;
}
