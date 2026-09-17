const BASE_URL = import.meta.env.VITE_API_URL || 'https://crudbackup.onrender.com'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Error ${res.status}: ${text || res.statusText}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  getEntities: () => request('/api/entities'),
  getMeta: (table) => request(`/api/${table}/_meta`),
  getAll: (table) => request(`/api/${table}/`),
  create: (table, data) => request(`/api/${table}/`, { method: 'POST', body: JSON.stringify(data) }),
  update: (table, id, data) => request(`/api/${table}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (table, id) => request(`/api/${table}/${id}`, { method: 'DELETE' }),
}
