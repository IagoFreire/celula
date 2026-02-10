import type {
  AuthResponse,
  LoginData,
  RegisterData,
  User,
  Schedule,
  AttendanceRecord,
  Cell,
  Study,
  Finance,
  FinanceSummary,
  Member,
} from './types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

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

  return data as T;
}

export const api = {
  // Auth
  login: (data: LoginData) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: RegisterData) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<User>('/auth/me'),

  // Schedules
  getSchedules: () => request<Schedule[]>('/schedules'),
  getUpcomingSchedules: () => request<Schedule[]>('/schedules/upcoming'),
  getSchedule: (id: number) => request<Schedule>(`/schedules/${id}`),
  createSchedule: (data: Record<string, unknown>) => request<Schedule>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: number, data: Record<string, unknown>) => request<Schedule>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id: number) => request<void>(`/schedules/${id}`, { method: 'DELETE' }),

  // Attendance
  confirmAttendance: (scheduleId: number) => request<void>(`/attendance/${scheduleId}`, { method: 'POST' }),
  cancelAttendance: (scheduleId: number) => request<void>(`/attendance/${scheduleId}`, { method: 'DELETE' }),
  checkAttendance: (scheduleId: number) => request<{ confirmed: boolean }>(`/attendance/check/${scheduleId}`),
  getMyAttendance: () => request<AttendanceRecord[]>('/attendance/my'),

  // Finances
  getFinances: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<Finance[]>(`/finances?${query}`);
  },
  getFinanceSummary: (params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    return request<FinanceSummary>(`/finances/summary?${query}`);
  },
  createFinance: (data: Record<string, unknown>) => request<Finance>('/finances', { method: 'POST', body: JSON.stringify(data) }),
  updateFinance: (id: number, data: Record<string, unknown>) => request<Finance>(`/finances/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFinance: (id: number) => request<void>(`/finances/${id}`, { method: 'DELETE' }),

  // Studies
  getStudies: (params?: Record<string, string>) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    return request<Study[]>(`/studies?${query}`);
  },
  getStudy: (id: number) => request<Study>(`/studies/${id}`),
  getStudyCategories: () => request<string[]>('/studies/categories'),
  createStudy: (formData: FormData) => request<Study>('/studies', { method: 'POST', body: formData }),
  updateStudy: (id: number, formData: FormData) => request<Study>(`/studies/${id}`, { method: 'PUT', body: formData }),
  deleteStudy: (id: number) => request<void>(`/studies/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: () => request<Member[]>('/members'),
  getMember: (id: number) => request<Member>(`/members/${id}`),
  updateMember: (id: number, data: Record<string, unknown>) => request<Member>(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: number) => request<void>(`/members/${id}`, { method: 'DELETE' }),

  // Cells
  getCells: () => request<Cell[]>('/cells'),
  createCell: (data: Record<string, unknown>) => request<Cell>('/cells', { method: 'POST', body: JSON.stringify(data) }),
  updateCell: (id: number, data: Record<string, unknown>) => request<Cell>(`/cells/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCell: (id: number) => request<void>(`/cells/${id}`, { method: 'DELETE' }),
};
