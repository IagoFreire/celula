const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Não definir Content-Type para FormData (o browser faz automaticamente)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Token inválido - fazer logout
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // Schedules
  getSchedules: () => request('/schedules'),
  getUpcomingSchedules: () => request('/schedules/upcoming'),
  getSchedule: (id) => request(`/schedules/${id}`),
  createSchedule: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id, data) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),

  // Attendance
  confirmAttendance: (scheduleId) => request(`/attendance/${scheduleId}`, { method: 'POST' }),
  cancelAttendance: (scheduleId) => request(`/attendance/${scheduleId}`, { method: 'DELETE' }),
  checkAttendance: (scheduleId) => request(`/attendance/check/${scheduleId}`),
  getMyAttendance: () => request('/attendance/my'),

  // Finances
  getFinances: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/finances?${query}`);
  },
  getFinanceSummary: (params) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    return request(`/finances/summary?${query}`);
  },
  createFinance: (data) => request('/finances', { method: 'POST', body: JSON.stringify(data) }),
  updateFinance: (id, data) => request(`/finances/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFinance: (id) => request(`/finances/${id}`, { method: 'DELETE' }),

  // Studies
  getStudies: (params) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    return request(`/studies?${query}`);
  },
  getStudy: (id) => request(`/studies/${id}`),
  getStudyCategories: () => request('/studies/categories'),
  createStudy: (formData) => request('/studies', { method: 'POST', body: formData }),
  updateStudy: (id, formData) => request(`/studies/${id}`, { method: 'PUT', body: formData }),
  deleteStudy: (id) => request(`/studies/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: () => request('/members'),
  getMember: (id) => request(`/members/${id}`),
  updateMember: (id, data) => request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),

  // Cells
  getCells: () => request('/cells'),
  createCell: (data) => request('/cells', { method: 'POST', body: JSON.stringify(data) }),
  updateCell: (id, data) => request(`/cells/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCell: (id) => request(`/cells/${id}`, { method: 'DELETE' }),
};
