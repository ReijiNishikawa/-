const totalAmountInput = document.getElementById('totalAmount');
const peopleCountInput = document.getElementById('peopleCount');
const perPersonAmount = document.getElementById('perPersonAmount');
const participantsBody = document.getElementById('participantsBody');

const STORAGE_KEY = 'warikan-assistant-state-v1';

const paymentOptions = [
  { value: '', label: '選択してください' },
  { value: 'cash', label: '現金' },
  { value: 'paypay', label: 'PayPay' },
  { value: 'linepay', label: 'LINE Pay' },
  { value: 'bank', label: '銀行振込' },
  { value: 'credit', label: 'クレジットカード' },
  { value: 'other', label: 'その他' }
];

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatCurrency(amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '---';
  }
  return `¥${amount.toLocaleString('ja-JP')}`;
}

function updatePerPerson() {
  const total = parseNonNegativeInt(totalAmountInput.value);
  const people = parsePositiveInt(peopleCountInput.value);

  if (total === null || people === null || people === 0) {
    perPersonAmount.textContent = '---';
    return;
  }

  const perPerson = Math.ceil((total / people) / 10) * 10;
  perPersonAmount.textContent = formatCurrency(perPerson);
}

function createParticipantRow(index) {
  const tr = document.createElement('tr');

  const indexCell = document.createElement('td');
  indexCell.dataset.field = 'index';
  indexCell.textContent = index;
  tr.appendChild(indexCell);

  const nameCell = document.createElement('td');
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = '例：山田太郎';
  nameInput.dataset.field = 'name';
  nameInput.addEventListener('input', handleParticipantChange);
  nameCell.appendChild(nameInput);
  tr.appendChild(nameCell);

  const paidCell = document.createElement('td');
  paidCell.classList.add('center-cell');
  const paidInput = document.createElement('input');
  paidInput.type = 'checkbox';
  paidInput.dataset.field = 'paid';
  paidInput.addEventListener('change', handleParticipantChange);
  paidCell.appendChild(paidInput);
  tr.appendChild(paidCell);

  const methodCell = document.createElement('td');
  const methodSelect = document.createElement('select');
  methodSelect.dataset.field = 'method';
  paymentOptions.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    methodSelect.appendChild(option);
  });
  methodSelect.addEventListener('change', handleParticipantChange);
  methodCell.appendChild(methodSelect);
  tr.appendChild(methodCell);

  const notesCell = document.createElement('td');
  const notesInput = document.createElement('textarea');
  notesInput.rows = 1;
  notesInput.placeholder = '必要があればメモ';
  notesInput.dataset.field = 'notes';
  notesInput.addEventListener('input', handleParticipantChange);
  notesCell.appendChild(notesInput);
  tr.appendChild(notesCell);

  return tr;
}

function setRowData(row, data) {
  if (!row || !data) {
    return;
  }
  const nameInput = row.querySelector('[data-field="name"]');
  const paidInput = row.querySelector('[data-field="paid"]');
  const methodSelect = row.querySelector('[data-field="method"]');
  const notesInput = row.querySelector('[data-field="notes"]');

  if (nameInput) nameInput.value = data.name ?? '';
  if (paidInput) paidInput.checked = Boolean(data.paid);
  if (methodSelect) methodSelect.value = data.method ?? '';
  if (notesInput) notesInput.value = data.notes ?? '';
}

function ensureParticipantRows(count, data = []) {
  const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
  const current = participantsBody.children.length;

  if (current > safeCount) {
    for (let i = current; i > safeCount; i -= 1) {
      participantsBody.removeChild(participantsBody.lastElementChild);
    }
  }

  for (let i = participantsBody.children.length; i < safeCount; i += 1) {
    const row = createParticipantRow(i + 1);
    participantsBody.appendChild(row);
  }

  Array.from(participantsBody.children).forEach((row, index) => {
    const indexCell = row.querySelector('[data-field="index"]');
    if (indexCell) {
      indexCell.textContent = index + 1;
    }
    if (data[index]) {
      setRowData(row, data[index]);
    }
  });
}

function collectParticipantData() {
  return Array.from(participantsBody.children).map((row) => ({
    name: row.querySelector('[data-field="name"]')?.value ?? '',
    paid: row.querySelector('[data-field="paid"]')?.checked ?? false,
    method: row.querySelector('[data-field="method"]')?.value ?? '',
    notes: row.querySelector('[data-field="notes"]')?.value ?? ''
  }));
}

function saveState() {
  const state = {
    total: totalAmountInput.value,
    count: peopleCountInput.value,
    participants: collectParticipantData()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('State save failed', error);
  }
}

function restoreState() {
  let saved;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('State load failed', error);
    return;
  }

  if (!saved) {
    ensureParticipantRows(parsePositiveInt(peopleCountInput.value) ?? 0);
    return;
  }

  try {
    const state = JSON.parse(saved);
    if (typeof state.total === 'string') {
      totalAmountInput.value = state.total;
    }
    if (typeof state.count === 'string') {
      peopleCountInput.value = state.count;
    }
    ensureParticipantRows(parsePositiveInt(peopleCountInput.value) ?? 0, Array.isArray(state.participants) ? state.participants : []);
  } catch (error) {
    console.warn('Invalid saved state', error);
    ensureParticipantRows(parsePositiveInt(peopleCountInput.value) ?? 0);
  }
}

function handleBaseInputChange() {
  if (this === peopleCountInput) {
    ensureParticipantRows(parsePositiveInt(peopleCountInput.value) ?? 0);
  }
  updatePerPerson();
  saveState();
}

function handleParticipantChange() {
  saveState();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }
}

function init() {
  restoreState();
  updatePerPerson();

  totalAmountInput.addEventListener('input', handleBaseInputChange);
  peopleCountInput.addEventListener('input', handleBaseInputChange);

  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);
