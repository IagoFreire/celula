import type {
  AuthResponse,
  LoginData,
  RegisterData,
  User,
  Cell,
  Study,
  Finance,
  FinanceSummary,
  Member,
  Leader,
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
    // Token inválido - fazer logout (mas não redirecionar em rotas de autenticação)
    const isAuthRoute = endpoint.startsWith('/auth/');
    if (response.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Erro na requisição');
  }

  return data as T;
}

export const api = {
  // Auth
  login: (data: LoginData) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: RegisterData) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  phoneLogin: (phone: string) => request<{ token: string; user: User; needs_cell?: boolean }>('/auth/phone-login', { method: 'POST', body: JSON.stringify({ phone }) }),
  phoneRegister: (name: string, phone: string, cell_id?: number) => request<AuthResponse>('/auth/phone-register', { method: 'POST', body: JSON.stringify({ name, phone, cell_id }) }),
  selectCell: (cell_id: number) => request<{ user: User }>('/auth/select-cell', { method: 'POST', body: JSON.stringify({ cell_id }) }),
  getMe: () => request<User>('/auth/me'),
  getPublicCells: () => request<{ id: number; name: string; description?: string; address?: string }[]>('/cells/public'),

  // Schedules (gerados automaticamente das células)
  getSchedules: () => request<Record<string, unknown>[]>('/schedules'),
  getUpcomingSchedules: () => request<Record<string, unknown>[]>('/schedules/upcoming'),
  cancelSchedule: (cell_id: number, date: string, reason: string) =>
    request<Record<string, unknown>>('/schedules/cancel', { method: 'POST', body: JSON.stringify({ cell_id, date, reason }) }),
  reactivateSchedule: (cell_id: number, date: string) =>
    request<Record<string, unknown>>('/schedules/reactivate', { method: 'POST', body: JSON.stringify({ cell_id, date }) }),

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
  getMember: (id: number) => request<Member>(`/members/${id}`),

  // Leaders
  getLeaders: () => request<Leader[]>('/auth/leaders'),
  createLeader: (data: { email: string; password: string; cell_id: number }) =>
    request<Leader>('/auth/leaders', { method: 'POST', body: JSON.stringify(data) }),
  deleteLeader: (id: number) => request<void>(`/auth/leaders/${id}`, { method: 'DELETE' }),

  // Password
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<{ message: string }>('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),

  // Meeting Attendance (presença em reuniões geradas)
  confirmMeetingAttendance: (cell_id: number, date: string) =>
    request<{ message: string }>('/attendance/meeting/confirm', { method: 'POST', body: JSON.stringify({ cell_id, date }) }),
  cancelMeetingAttendance: (cell_id: number, date: string) =>
    request<{ message: string }>('/attendance/meeting/cancel', { method: 'DELETE', body: JSON.stringify({ cell_id, date }) }),
  checkMeetingAttendanceBatch: (meetings: { cell_id: number; date: string }[]) =>
    request<{ confirmed: { cell_id: number; date: string }[]; counts: { cell_id: number; date: string; count: number }[] }>(
      '/attendance/meeting/check-batch', { method: 'POST', body: JSON.stringify({ meetings }) }
    ),

  // Attendance Validation (validação real de presença)
  getValidationMeetings: (cellId: number) =>
    request<Record<string, unknown>[]>(`/attendance-validation/meetings/${cellId}`),
  prepareValidation: (cellId: number, date: string) =>
    request<{
      confirmed: { user_id: number; name: string; phone?: string }[];
      allMembers: { id: number; name: string; phone?: string; role: string }[];
      validated: { user_id: number; user_name: string; was_confirmed: boolean }[];
    }>(`/attendance-validation/prepare/${cellId}/${date}`),
  submitValidation: (cell_id: number, date: string, attendees: { user_id: number; was_confirmed: boolean }[]) =>
    request<{ message: string; count: number }>('/attendance-validation/validate', {
      method: 'POST',
      body: JSON.stringify({ cell_id, date, attendees }),
    }),
  getValidationHistory: (cell_id?: number) => {
    const query = cell_id ? `?cell_id=${cell_id}` : '';
    return request<{
      cell_id: number;
      date: string;
      cell_name: string;
      total_present: number;
      confirmed_present: number;
      unconfirmed_present: number;
      validated_at: string;
    }[]>(`/attendance-validation/history${query}`);
  },
  getValidationDetail: (cellId: number, date: string) =>
    request<{ user_id: number; user_name: string; user_phone?: string; was_confirmed: boolean }[]>(
      `/attendance-validation/detail/${cellId}/${date}`
    ),

  // Cells
  getCells: () => request<Cell[]>('/cells'),
  createCell: (data: Record<string, unknown>) => request<Cell>('/cells', { method: 'POST', body: JSON.stringify(data) }),
  updateCell: (id: number, data: Record<string, unknown>) => request<Cell>(`/cells/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCell: (id: number) => request<void>(`/cells/${id}`, { method: 'DELETE' }),
  getCellMembers: (cellId: number) => request<Member[]>(`/cells/${cellId}/members`),
  addCellMember: (cellId: number, data: { name: string; phone: string }) => request<Member>(`/cells/${cellId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeCellMember: (cellId: number, userId: number) => request<void>(`/cells/${cellId}/members/${userId}`, { method: 'DELETE' }),
};
