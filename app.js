// --- State ---
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

// --- Storage ---
function getEntries() {
  return JSON.parse(localStorage.getItem('worklog-entries') || '{}');
}

function saveEntry(dateKey, text) {
  const entries = getEntries();
  if (text.trim()) {
    entries[dateKey] = text.trim();
  } else {
    delete entries[dateKey];
  }
  localStorage.setItem('worklog-entries', JSON.stringify(entries));
}

function deleteEntry(dateKey) {
  const entries = getEntries();
  delete entries[dateKey];
  localStorage.setItem('worklog-entries', JSON.stringify(entries));
}

// --- Helpers ---
function dateKey(date) {
  return date.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

// --- Calendar Rendering ---
function renderCalendar() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  document.getElementById('current-month').textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const container = document.getElementById('calendar-days');
  container.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1);
  // Adjust so Monday = 0
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const entries = getEntries();

  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const cell = createDayCell(dayNum, true);
    container.appendChild(cell);
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const key = dateKey(date);
    const cell = createDayCell(d, false, date, entries[key]);
    container.appendChild(cell);
  }

  // Next month padding
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    const cell = createDayCell(i, true);
    container.appendChild(cell);
  }
}

function createDayCell(dayNum, isOtherMonth, date, entry) {
  const cell = document.createElement('div');
  cell.className = 'day-cell';

  if (isOtherMonth) {
    cell.classList.add('other-month');
  } else {
    if (isWeekend(date)) cell.classList.add('weekend');
    if (isToday(date)) cell.classList.add('today');
    if (entry) cell.classList.add('has-entry');

    cell.addEventListener('click', () => openModal(date, entry));
  }

  const num = document.createElement('div');
  num.className = 'day-number';
  num.textContent = dayNum;
  cell.appendChild(num);

  if (entry && !isOtherMonth) {
    const dot = document.createElement('div');
    dot.className = 'entry-dot';
    cell.appendChild(dot);

    const preview = document.createElement('div');
    preview.className = 'day-preview';
    preview.textContent = entry.split('\n')[0];
    cell.appendChild(preview);
  }

  return cell;
}

// --- Modal ---
function openModal(date, entry) {
  selectedDate = date;
  const modal = document.getElementById('entry-modal');
  document.getElementById('modal-date').textContent = formatDate(dateKey(date));
  document.getElementById('entry-text').value = entry || '';
  document.getElementById('delete-entry').style.display = entry ? 'inline-block' : 'none';
  modal.classList.remove('hidden');
  document.getElementById('entry-text').focus();
}

function closeModal() {
  document.getElementById('entry-modal').classList.add('hidden');
  selectedDate = null;
}

document.getElementById('close-modal').addEventListener('click', closeModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

document.getElementById('save-entry').addEventListener('click', () => {
  const text = document.getElementById('entry-text').value;
  saveEntry(dateKey(selectedDate), text);
  closeModal();
  renderCalendar();
});

document.getElementById('delete-entry').addEventListener('click', () => {
  deleteEntry(dateKey(selectedDate));
  closeModal();
  renderCalendar();
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && e.metaKey && selectedDate) {
    document.getElementById('save-entry').click();
  }
});

// --- Month Navigation ---
document.getElementById('prev-month').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});

// --- Tabs ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-view`).classList.add('active');
    if (tab.dataset.tab === 'report') populateWeekSelector();
  });
});

// --- Report Generation ---
function getFridaysInRange() {
  const entries = getEntries();
  const dates = Object.keys(entries).sort();
  if (dates.length === 0) return [];

  const firstDate = new Date(dates[0] + 'T12:00:00');
  const lastDate = new Date(dates[dates.length - 1] + 'T12:00:00');

  // Also include current week
  const today = new Date();
  const end = lastDate > today ? lastDate : today;

  const fridays = [];
  const d = new Date(firstDate);
  // Go to the Friday of that week
  const dayOfWeek = d.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  d.setDate(d.getDate() + daysUntilFriday);

  while (d <= end || fridays.length === 0) {
    fridays.push(dateKey(d));
    d.setDate(d.getDate() + 7);
    if (fridays.length > 52) break; // safety
  }

  // Add one more friday after the last entry to cover current week
  if (fridays.length > 0) {
    const lastFri = new Date(fridays[fridays.length - 1] + 'T12:00:00');
    lastFri.setDate(lastFri.getDate() + 7);
    if (lastFri <= new Date(today.getTime() + 7 * 86400000)) {
      fridays.push(dateKey(lastFri));
    }
  }

  return fridays.reverse(); // Most recent first
}

function populateWeekSelector() {
  const select = document.getElementById('report-week');
  select.innerHTML = '';
  const fridays = getFridaysInRange();

  if (fridays.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No entries yet';
    select.appendChild(opt);
    return;
  }

  fridays.forEach(fri => {
    const monday = new Date(fri + 'T12:00:00');
    monday.setDate(monday.getDate() - 4);
    const opt = document.createElement('option');
    opt.value = fri;
    opt.textContent = `${formatShortDate(dateKey(monday))} - ${formatShortDate(fri)}`;
    select.appendChild(opt);
  });
}

document.getElementById('generate-report').addEventListener('click', () => {
  const fridayStr = document.getElementById('report-week').value;
  if (!fridayStr) return;

  const friday = new Date(fridayStr + 'T12:00:00');
  const monday = new Date(friday);
  monday.setDate(friday.getDate() - 4);

  const entries = getEntries();
  const reportEl = document.getElementById('report-content');
  const outputEl = document.getElementById('report-output');

  let html = '';
  let plainText = '';
  const weekLabel = `${formatShortDate(dateKey(monday))} - ${formatShortDate(fridayStr)}`;

  html += `<div class="report-title">Weekly Report: ${weekLabel}</div>`;
  plainText += `Weekly Report: ${weekLabel}\n${'='.repeat(40)}\n\n`;

  let hasAnyEntry = false;

  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateKey(d);
    const dayName = getDayName(key);
    const entry = entries[key];

    html += `<h4>${dayName}, ${formatShortDate(key)}</h4>`;
    plainText += `${dayName}, ${formatShortDate(key)}\n`;

    if (entry) {
      hasAnyEntry = true;
      const lines = entry.split('\n').filter(l => l.trim());
      html += '<ul>';
      lines.forEach(line => {
        const clean = line.replace(/^[-*]\s*/, '');
        html += `<li>${escapeHtml(clean)}</li>`;
        plainText += `  - ${clean}\n`;
      });
      html += '</ul>';
    } else {
      html += '<p class="no-entries">No entry</p>';
      plainText += '  No entry\n';
    }
    plainText += '\n';
  }

  if (!hasAnyEntry) {
    html = '<p class="no-entries">No entries for this week. Add daily logs in the Calendar tab first.</p>';
  }

  reportEl.innerHTML = html;
  outputEl.classList.remove('hidden');

  // Store plain text for copying
  outputEl.dataset.plainText = plainText;
});

document.getElementById('copy-report').addEventListener('click', () => {
  const outputEl = document.getElementById('report-output');
  const text = outputEl.dataset.plainText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-report');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
});

// --- API Key Management ---
function getApiKey() {
  return localStorage.getItem('worklog-openai-key') || '';
}

function saveApiKey(key) {
  if (key.trim()) {
    localStorage.setItem('worklog-openai-key', key.trim());
  } else {
    localStorage.removeItem('worklog-openai-key');
  }
}

function updateApiKeyStatus() {
  const status = document.getElementById('api-key-status');
  const input = document.getElementById('api-key-input');
  const key = getApiKey();
  if (key) {
    status.textContent = `Key saved (${key.slice(0, 7)}...${key.slice(-4)})`;
    status.className = 'api-key-status saved';
    input.value = '';
    input.placeholder = 'Key saved — paste a new one to replace';
  } else {
    status.textContent = '';
    status.className = 'api-key-status';
    input.placeholder = 'sk-...';
  }
}

document.getElementById('save-api-key').addEventListener('click', () => {
  const input = document.getElementById('api-key-input');
  if (!input.value.trim()) return;
  saveApiKey(input.value);
  updateApiKeyStatus();
});

document.getElementById('clear-api-key').addEventListener('click', () => {
  saveApiKey('');
  updateApiKeyStatus();
});

document.getElementById('api-key-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('save-api-key').click();
});

// --- AI Polish ---
document.getElementById('polish-report').addEventListener('click', async () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    document.getElementById('api-key-section').querySelector('details').open = true;
    document.getElementById('api-key-input').focus();
    const status = document.getElementById('api-key-status');
    status.textContent = 'Please add your OpenAI API key first';
    status.className = 'api-key-status error';
    return;
  }

  const outputEl = document.getElementById('report-output');
  const plainText = outputEl.dataset.plainText;
  if (!plainText || !plainText.trim()) return;

  const btn = document.getElementById('polish-report');
  const polishedSection = document.getElementById('polished-section');
  const polishedContent = document.getElementById('polished-content');

  btn.disabled = true;
  btn.textContent = 'Polishing...';
  polishedSection.classList.add('hidden');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional writing assistant. Rewrite the following weekly work report so it is polished, concise, and suitable for sharing with a manager. Use a confident, professional tone that highlights impact and accomplishments. Group related items where it makes sense. Keep bullet-point format. Do not invent work that isn\'t mentioned — only rephrase and reorganize what\'s there. Preserve the week date range in the title.',
          },
          { role: 'user', content: plainText },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `OpenAI returned ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const polished = data.choices?.[0]?.message?.content;
    if (!polished) throw new Error('No response from OpenAI');

    polishedContent.innerHTML = renderMarkdown(polished);
    polishedSection.dataset.plainText = polished;
    polishedSection.classList.remove('hidden');
  } catch (err) {
    polishedContent.innerHTML = `<p class="polish-error">Could not polish the report: ${escapeHtml(err.message)}</p>`;
    polishedSection.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Polish for Manager';
  }
});

document.getElementById('copy-polished').addEventListener('click', () => {
  const text = document.getElementById('polished-section').dataset.plainText;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-polished');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
});

function renderMarkdown(text) {
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<div class="report-title">${escapeHtml(trimmed.slice(2))}</div>`;
    } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      const level = trimmed.startsWith('### ') ? 3 : 2;
      html += `<h4>${escapeHtml(trimmed.slice(level + 1))}</h4>`;
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${escapeHtml(trimmed.slice(2))}</li>`;
    } else if (trimmed === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${escapeHtml(trimmed)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Init ---
renderCalendar();
updateApiKeyStatus();
