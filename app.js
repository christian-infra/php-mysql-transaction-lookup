'use strict';

// This file owns presentation only. The PHP endpoint owns database access,
// validation, authorization, SQL execution, and safe JSON responses.
const API_PATH = 'api/transactions.php';

const ui = {
  searchForm: document.querySelector('#searchForm'),
  transactionInput: document.querySelector('#transactionInput'),
  statusFilter: document.querySelector('#statusFilter'),
  refreshButton: document.querySelector('#refreshButton'),
  searchButton: document.querySelector('#searchButton'),
  clearButton: document.querySelector('#clearButton'),
  validationMessage: document.querySelector('#validationMessage'),
  transactionsBody: document.querySelector('#transactionsBody'),
  emptyState: document.querySelector('#emptyState'),
  emptyHeading: document.querySelector('#emptyHeading'),
  emptyDescription: document.querySelector('#emptyDescription'),
  resultsSubtitle: document.querySelector('#resultsSubtitle'),
  footerCount: document.querySelector('#footerCount'),
  notice: document.querySelector('#notice'),
  apiIndicator: document.querySelector('#apiIndicator'),
  apiIndicatorText: document.querySelector('#apiIndicatorText'),
  metricCount: document.querySelector('#metricCount'),
  metricApproved: document.querySelector('#metricApproved'),
  metricDeclined: document.querySelector('#metricDeclined'),
  metricVolume: document.querySelector('#metricVolume'),
};

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2,
});

let transactions = [];
let currentSearch = '';
let loadSequence = 0;

function statusValue(transaction) {
  return String(transaction.trans_status ?? '').trim().toUpperCase();
}

function formatAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? moneyFormatter.format(number) : 'N/A';
}

function displayDate(value) {
  // Preserve the database's wall-clock time rather than guessing a timezone.
  const dateString = String(value ?? '');
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/.exec(dateString);
  if (!match) return dateString || 'N/A';
  return `${match[2]}/${match[3]}/${match[1]} ${match[4]}:${match[5]}`;
}

function setConnectionState(state) {
  ui.apiIndicator.classList.remove('online', 'offline');
  if (state !== 'checking') ui.apiIndicator.classList.add(state === 'online' ? 'online' : 'offline');
  ui.apiIndicatorText.textContent = state === 'online' ? 'API connected' : state === 'offline' ? 'API unavailable' : 'Checking API';
}

function setBusy(isBusy) {
  ui.refreshButton.disabled = isBusy;
  ui.searchButton.disabled = isBusy;
  ui.searchButton.textContent = isBusy ? 'Loading...' : 'Search';
}

function showNotice(message) {
  ui.notice.textContent = message;
  ui.notice.hidden = !message;
}

function showValidation(message) {
  ui.validationMessage.textContent = message;
  ui.validationMessage.hidden = !message;
}

function applyStatusFilter() {
  const selected = ui.statusFilter.value;
  if (selected === 'ALL') return transactions;
  return transactions.filter((transaction) => {
    const status = statusValue(transaction);
    if (selected === 'OTHER') return status !== 'APPROVED' && status !== 'DECLINED';
    return status === selected;
  });
}

function createCell(value, className) {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  // textContent avoids interpreting server-returned strings as HTML.
  cell.textContent = String(value ?? '');
  return cell;
}

function appendTransactionRow(transaction) {
  const row = document.createElement('tr');
  row.append(createCell(transaction.trans_num, 'primary-cell'));
  row.append(createCell(displayDate(transaction.trans_date)));
  row.append(createCell(transaction.store_num));
  row.append(createCell(transaction.cashier_id));

  const statusCell = document.createElement('td');
  const statusPill = document.createElement('span');
  const status = statusValue(transaction);
  statusPill.className = 'status-pill';
  if (status === 'APPROVED') statusPill.classList.add('approved');
  if (status === 'DECLINED') statusPill.classList.add('declined');
  if (status === 'PENDING') statusPill.classList.add('pending');
  statusPill.textContent = status || 'UNKNOWN';
  statusCell.append(statusPill);
  row.append(statusCell);

  row.append(createCell(formatAmount(transaction.trans_amnt), 'amount'));
  ui.transactionsBody.append(row);
}

function render() {
  const visible = applyStatusFilter();
  ui.transactionsBody.replaceChildren();
  visible.forEach(appendTransactionRow);

  const approved = visible.filter((t) => statusValue(t) === 'APPROVED');
  ui.metricCount.textContent = String(visible.length);
  ui.metricApproved.textContent = String(approved.length);
  ui.metricDeclined.textContent = String(visible.filter((t) => statusValue(t) === 'DECLINED').length);
  ui.metricVolume.textContent = formatAmount(approved.reduce((sum, t) => sum + (Number(t.trans_amnt) || 0), 0));
  ui.footerCount.textContent = `${visible.length} record${visible.length === 1 ? '' : 's'}`;
  ui.resultsSubtitle.textContent = currentSearch ? `Results for transaction #${currentSearch}` : 'Recent transaction records returned by your PHP endpoint.';

  ui.emptyState.hidden = visible.length > 0;
  if (!visible.length) {
    ui.emptyHeading.textContent = currentSearch ? 'No matching transaction' : 'No transactions to display';
    ui.emptyDescription.textContent = transactions.length
      ? 'No records match this status filter. Try another status.'
      : currentSearch ? 'Check the transaction number or clear the search.'
        : 'Insert synthetic sales records in MySQL, then refresh the page.';
  }
}

async function loadTransactions(transNum = '') {
  const sequence = ++loadSequence;
  currentSearch = transNum;
  setBusy(true);
  showNotice('');
  showValidation('');
  setConnectionState('checking');

  const apiUrl = new URL(API_PATH, document.baseURI);
  if (transNum) apiUrl.searchParams.set('trans_num', transNum);

  try {
    const response = await fetch(apiUrl, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
    // The backend must respond with JSON; never assume a 200 response is valid.
    const payload = await response.json();
    if (!response.ok || payload?.success !== true || !Array.isArray(payload.transactions)) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : `API returned an invalid response (HTTP ${response.status}).`);
    }
    if (sequence !== loadSequence) return;
    transactions = payload.transactions;
    setConnectionState('online');
    render();
  } catch (error) {
    if (sequence !== loadSequence) return;
    transactions = [];
    setConnectionState('offline');
    render();
    showNotice(`Could not load transactions. ${error.message || 'Check the PHP endpoint and Apache error log.'}`);
  } finally {
    if (sequence === loadSequence) setBusy(false);
  }
}

ui.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = ui.transactionInput.value.trim();
  if (value && !/^\d+$/.test(value)) {
    showValidation('Enter a whole-number transaction ID (digits only).');
    return;
  }
  loadTransactions(value);
});

ui.statusFilter.addEventListener('change', render);
ui.refreshButton.addEventListener('click', () => loadTransactions(currentSearch));
ui.clearButton.addEventListener('click', () => {
  ui.transactionInput.value = '';
  ui.statusFilter.value = 'ALL';
  loadTransactions('');
});

loadTransactions();
