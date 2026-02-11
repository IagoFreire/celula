export interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'member';
  created_at?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Schedule {
  id: number;
  cell_id?: number;
  title: string;
  date: string;
  time: string;
  location: string;
  leader_id?: number;
  leader_name?: string;
  study_id?: number;
  study_title?: string;
  cell_name?: string;
  notes?: string;
  confirmed_count: number;
  attendees?: Attendee[];
}

export interface Attendee {
  id: number;
  name: string;
  phone?: string;
}

export interface AttendanceRecord {
  schedule_id: number;
  title?: string;
  date?: string;
  time?: string;
}

export interface Cell {
  id: number;
  name: string;
  description?: string;
  address?: string;
  day_of_week?: number | null;
  meeting_time?: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  next_date?: string | null;
  member_count?: number;
  created_at?: string;
}

export interface Study {
  id: number;
  title: string;
  description?: string;
  content?: string;
  category?: string;
  keywords?: string;
  file_path?: string;
  created_by_name?: string;
  created_at: string;
}

export interface Finance {
  id: number;
  cell_id?: number;
  cell_name?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  date: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  byCategory?: CategorySummary[];
}

export interface CategorySummary {
  category: string;
  type: 'income' | 'expense';
  total: number;
  count: number;
}

export interface Member extends User {
  total_attendance?: number;
  stats?: MemberStats;
  attendanceHistory?: AttendanceHistory[];
}

export interface MemberStats {
  total: number;
  last_30_days: number;
  last_90_days: number;
}

export interface AttendanceHistory {
  title: string;
  date: string;
  time: string;
}

export interface FinanceFilters {
  cell_id?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
}

export interface FinanceForm {
  cell_id: string;
  type: string;
  category: string;
  amount: string;
  description: string;
  date: string;
}

export interface ScheduleForm {
  cell_id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  leader_id: string;
  study_id: string;
  notes: string;
}

export interface MemberForm {
  name: string;
  phone: string;
  role: string;
}

export interface StudyForm {
  title: string;
  description: string;
  content: string;
  category: string;
  keywords: string;
}

export interface StudyParams {
  search?: string;
  category?: string;
}
