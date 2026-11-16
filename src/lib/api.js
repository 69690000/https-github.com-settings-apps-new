async function request(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function fetchTransactions({ search, status, sort, page, pageSize }) {
  const params = new URLSearchParams({
    search: search || '',
    status: status || 'all',
    sort: sort || 'newest',
    page: String(page || 1),
    pageSize: String(pageSize || 25),
  });
  return request(`/api/transactions?${params.toString()}`);
}

export function fetchStats() {
  return request('/api/stats');
}

export function importCsv(csv) {
  return request('/api/transactions/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv }),
  });
}

export function loadSample() {
  return request('/api/sample', { method: 'POST' });
}

export function deleteTransaction(id) {
  return request(`/api/transactions/${id}`, { method: 'DELETE' });
}

export function clearAll() {
  return request('/api/transactions', { method: 'DELETE' });
}
