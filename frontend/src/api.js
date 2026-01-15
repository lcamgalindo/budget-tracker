const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export async function uploadReceipt(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/receipts/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function createManualEntry(data) {
  const res = await fetch(`${API_BASE}/receipts/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save');
  return res.json();
}

export async function updateReceipt(id, data) {
  const res = await fetch(`${API_BASE}/receipts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return res.json();
}

export async function getBudget(year = null, month = null) {
  let url = `${API_BASE}/budget`;
  if (year && month) {
    url += `?year=${year}&month=${month}`;
  }
  const res = await fetch(url);
  return res.json();
}

export { API_BASE };