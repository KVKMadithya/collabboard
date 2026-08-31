const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('collab_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }

  return response.json();
}