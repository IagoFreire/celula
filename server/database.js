import pool from './db/pool.js';

// ========== API DO BANCO DE DADOS (PostgreSQL) ==========
export const db = {
  // --- Users ---
  async findUserByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async findUserByPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE REGEXP_REPLACE(phone, '\\D', '', 'g') = $1`,
      [cleanPhone]
    );
    return rows[0] || null;
  },

  async findUserById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async getAllUsers() {
    const { rows } = await pool.query(`
      SELECT u.*, COUNT(a.id)::int AS total_attendance
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id
      GROUP BY u.id
      ORDER BY u.name
    `);
    return rows;
  },

  async createUser({ name, email, password, phone, role }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, phone, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email || null, password || null, phone || null, role || 'member']
    );
    return rows[0];
  },

  async updateUser(id, { name, email, phone, role }) {
    const { rows } = await pool.query(
      `UPDATE users SET name = $1, email = $2, phone = $3, role = $4 
       WHERE id = $5 RETURNING *`,
      [name, email || null, phone || null, role, id]
    );
    if (rows.length === 0) return null;
    return rows[0];
  },

  async deleteUser(id) {
    await pool.query('DELETE FROM attendance WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },

  async getUserWithHistory(id) {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    const { password, ...safeUser } = user;

    // Histórico de presença
    const { rows: attendanceHistory } = await pool.query(`
      SELECT a.confirmed_at, s.title, s.date, s.time, s.location, c.name AS cell_name
      FROM attendance a
      JOIN schedules s ON s.id = a.schedule_id
      LEFT JOIN cells c ON c.id = s.cell_id
      WHERE a.user_id = $1
      ORDER BY s.date DESC
    `, [id]);

    // Estatísticas
    const { rows: statsRows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE s.date >= CURRENT_DATE - INTERVAL '30 days')::int AS last_30_days,
        COUNT(*) FILTER (WHERE s.date >= CURRENT_DATE - INTERVAL '90 days')::int AS last_90_days
      FROM attendance a
      JOIN schedules s ON s.id = a.schedule_id
      WHERE a.user_id = $1
    `, [id]);

    return {
      ...safeUser,
      attendanceHistory,
      stats: statsRows[0] || { total: 0, last_30_days: 0, last_90_days: 0 },
    };
  },

  // --- Cells ---
  async getAllCells() {
    const { rows } = await pool.query(`
      SELECT c.*, COUNT(u.id)::int AS member_count, leader.name AS leader_name, leader.email AS leader_email
      FROM cells c
      LEFT JOIN users u ON u.cell_id = c.id AND u.role = 'member'
      LEFT JOIN users leader ON leader.id = c.leader_id
      GROUP BY c.id, leader.name, leader.email
      ORDER BY c.name
    `);
    return rows;
  },

  async getCellMembers(cellId) {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.phone, u.role, u.created_at,
             COUNT(a.id)::int AS total_attendance
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id
      WHERE u.cell_id = $1
      GROUP BY u.id
      ORDER BY u.name
    `, [cellId]);
    return rows;
  },

  async createCell({ name, description, address, day_of_week, meeting_time, frequency, next_date }) {
    const { rows } = await pool.query(
      `INSERT INTO cells (name, description, address, day_of_week, meeting_time, frequency, next_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description || null, address || null, day_of_week ?? null, meeting_time || null, frequency || 'weekly', next_date || null]
    );
    return rows[0];
  },

  async updateCell(id, { name, description, address, day_of_week, meeting_time, frequency, next_date }) {
    const { rows } = await pool.query(
      `UPDATE cells SET name = $1, description = $2, address = $3, day_of_week = $4, meeting_time = $5, frequency = $6, next_date = $7
       WHERE id = $8 RETURNING *`,
      [name, description || null, address || null, day_of_week ?? null, meeting_time || null, frequency || 'weekly', next_date || null, id]
    );
    return rows[0] || null;
  },

  async deleteCell(id) {
    // Desassocia membros antes de excluir
    await pool.query('UPDATE users SET cell_id = NULL WHERE cell_id = $1', [id]);
    await pool.query('DELETE FROM cells WHERE id = $1', [id]);
  },

  async addMemberToCell(cellId, { name, phone }) {
    // Verifica se o telefone já está cadastrado
    const existing = await this.findUserByPhone(phone);
    if (existing) {
      // Apenas associa à célula
      const { rows } = await pool.query(
        'UPDATE users SET cell_id = $1 WHERE id = $2 RETURNING *',
        [cellId, existing.id]
      );
      return rows[0];
    }
    // Cria novo membro
    const { rows } = await pool.query(
      `INSERT INTO users (name, phone, role, cell_id) VALUES ($1, $2, 'member', $3) RETURNING *`,
      [name, phone, cellId]
    );
    return rows[0];
  },

  async removeMemberFromCell(userId) {
    const { rows } = await pool.query(
      'UPDATE users SET cell_id = NULL WHERE id = $1 RETURNING *',
      [userId]
    );
    return rows[0] || null;
  },

  // --- Schedule Cancellations ---
  async cancelSchedule(cellId, date, reason, cancelledBy) {
    const { rows } = await pool.query(
      `INSERT INTO schedule_cancellations (cell_id, date, reason, cancelled_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cell_id, date) DO UPDATE SET reason = $3, cancelled_by = $4
       RETURNING *`,
      [cellId, date, reason || null, cancelledBy || null]
    );
    return rows[0];
  },

  async reactivateSchedule(cellId, date) {
    await pool.query(
      'DELETE FROM schedule_cancellations WHERE cell_id = $1 AND date = $2',
      [cellId, date]
    );
  },

  async getCancellations() {
    const { rows } = await pool.query(`
      SELECT sc.*, u.name AS cancelled_by_name
      FROM schedule_cancellations sc
      LEFT JOIN users u ON u.id = sc.cancelled_by
      ORDER BY sc.date
    `);
    return rows;
  },

  // --- Schedule Generation (from cells) ---
  async generateCellSchedule() {
    // Busca todas as células com dia da semana configurado
    const { rows: cells } = await pool.query(`
      SELECT c.*, COUNT(u.id)::int AS member_count
      FROM cells c
      LEFT JOIN users u ON u.cell_id = c.id AND u.role = 'member'
      WHERE c.day_of_week IS NOT NULL
      GROUP BY c.id
      ORDER BY c.name
    `);

    // Busca cancelamentos
    const { rows: cancellations } = await pool.query(
      'SELECT cell_id, date, reason FROM schedule_cancellations'
    );
    const cancelMap = new Map();
    for (const c of cancellations) {
      const key = `${c.cell_id}_${c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date).split('T')[0]}`;
      cancelMap.set(key, c.reason);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setMonth(limit.getMonth() + 3);

    const meetings = [];

    for (const cell of cells) {
      const targetDay = cell.day_of_week; // 0=Dom, 1=Seg, ...

      // Se next_date definido e >= hoje, usar como ponto de partida
      let current;
      if (cell.next_date) {
        const nd = cell.next_date instanceof Date
          ? cell.next_date
          : new Date(String(cell.next_date).split('T')[0] + 'T00:00:00');
        if (nd >= today) {
          current = new Date(nd);
        } else {
          // next_date já passou, calcular normalmente a partir de hoje
          current = new Date(today);
          const diff = (targetDay - current.getDay() + 7) % 7;
          current.setDate(current.getDate() + (diff === 0 ? 0 : diff));
        }
      } else {
        // Encontrar a próxima ocorrência desse dia a partir de hoje
        current = new Date(today);
        const diff = (targetDay - current.getDay() + 7) % 7;
        current.setDate(current.getDate() + (diff === 0 ? 0 : diff));
      }

      // Gerar datas até 3 meses
      while (current <= limit) {
        const dateStr = current.toISOString().split('T')[0];
        const cancelKey = `${cell.id}_${dateStr}`;
        const isCancelled = cancelMap.has(cancelKey);

        meetings.push({
          cell_id: cell.id,
          title: cell.name,
          date: dateStr,
          time: cell.meeting_time || '19:00',
          location: cell.address || 'A definir',
          cell_name: cell.name,
          description: cell.description,
          frequency: cell.frequency,
          member_count: cell.member_count,
          cancelled: isCancelled,
          cancel_reason: isCancelled ? cancelMap.get(cancelKey) : null,
        });

        // Avançar pela frequência
        if (cell.frequency === 'biweekly') {
          current.setDate(current.getDate() + 14);
        } else if (cell.frequency === 'monthly') {
          current.setMonth(current.getMonth() + 1);
          // Ajustar para o dia da semana correto no próximo mês
          const newDiff = (targetDay - current.getDay() + 7) % 7;
          current.setDate(current.getDate() + newDiff);
        } else {
          // weekly (default)
          current.setDate(current.getDate() + 7);
        }
      }
    }

    // Ordenar por data e horário
    meetings.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || '').localeCompare(b.time || '');
    });

    return meetings;
  },

  // Gerar cronograma incluindo reuniões passadas (para validação de presença)
  async generateCellScheduleWithPast(cellId, monthsBack = 3) {
    // Busca a célula específica
    const { rows: cells } = await pool.query(`
      SELECT c.*, COUNT(u.id)::int AS member_count
      FROM cells c
      LEFT JOIN users u ON u.cell_id = c.id AND u.role = 'member'
      WHERE c.day_of_week IS NOT NULL AND c.id = $1
      GROUP BY c.id
    `, [cellId]);

    if (cells.length === 0) return [];

    // Busca cancelamentos
    const { rows: cancellations } = await pool.query(
      'SELECT cell_id, date, reason FROM schedule_cancellations WHERE cell_id = $1',
      [cellId]
    );
    const cancelMap = new Map();
    for (const c of cancellations) {
      const key = `${c.cell_id}_${c.date instanceof Date ? c.date.toISOString().split('T')[0] : String(c.date).split('T')[0]}`;
      cancelMap.set(key, c.reason);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Limite do passado
    const pastLimit = new Date(today);
    pastLimit.setMonth(pastLimit.getMonth() - monthsBack);

    // Limite do futuro (incluir hoje + 1 dia para pegar reunião de hoje)
    const futureLimit = new Date(today);
    futureLimit.setDate(futureLimit.getDate() + 1);

    const meetings = [];
    const cell = cells[0];
    const targetDay = cell.day_of_week;

    // Ponto de partida: referência base da célula
    let startDate;
    if (cell.next_date) {
      const nd = cell.next_date instanceof Date
        ? cell.next_date
        : new Date(String(cell.next_date).split('T')[0] + 'T00:00:00');
      startDate = new Date(nd);
    } else if (cell.created_at) {
      startDate = new Date(cell.created_at);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(pastLimit);
    }

    // Retroceder a startDate até antes de pastLimit para cobrir todo o período
    // Primeiro ajustar para o dia correto da semana
    const diffToTarget = (targetDay - startDate.getDay() + 7) % 7;
    startDate.setDate(startDate.getDate() + (diffToTarget === 0 ? 0 : diffToTarget));

    // Voltar no tempo até antes de pastLimit
    while (startDate > pastLimit) {
      if (cell.frequency === 'biweekly') {
        startDate.setDate(startDate.getDate() - 14);
      } else if (cell.frequency === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
        const newDiff = (targetDay - startDate.getDay() + 7) % 7;
        startDate.setDate(startDate.getDate() + newDiff);
      } else {
        startDate.setDate(startDate.getDate() - 7);
      }
    }

    // Avançar até pastLimit
    while (startDate < pastLimit) {
      if (cell.frequency === 'biweekly') {
        startDate.setDate(startDate.getDate() + 14);
      } else if (cell.frequency === 'monthly') {
        startDate.setMonth(startDate.getMonth() + 1);
        const newDiff = (targetDay - startDate.getDay() + 7) % 7;
        startDate.setDate(startDate.getDate() + newDiff);
      } else {
        startDate.setDate(startDate.getDate() + 7);
      }
    }

    // Gerar reuniões de pastLimit até hoje (inclusive)
    let current = new Date(startDate);
    while (current <= futureLimit) {
      const dateStr = current.toISOString().split('T')[0];
      const cancelKey = `${cell.id}_${dateStr}`;
      const isCancelled = cancelMap.has(cancelKey);

      meetings.push({
        cell_id: cell.id,
        title: cell.name,
        date: dateStr,
        time: cell.meeting_time || '19:00',
        location: cell.address || 'A definir',
        cell_name: cell.name,
        description: cell.description,
        frequency: cell.frequency,
        member_count: cell.member_count,
        cancelled: isCancelled,
        cancel_reason: isCancelled ? cancelMap.get(cancelKey) : null,
      });

      if (cell.frequency === 'biweekly') {
        current.setDate(current.getDate() + 14);
      } else if (cell.frequency === 'monthly') {
        current.setMonth(current.getMonth() + 1);
        const newDiff = (targetDay - current.getDay() + 7) % 7;
        current.setDate(current.getDate() + newDiff);
      } else {
        current.setDate(current.getDate() + 7);
      }
    }

    // Ordenar do mais recente pro mais antigo
    meetings.sort((a, b) => b.date.localeCompare(a.date));

    return meetings;
  },

  // --- Schedules ---
  async getAllSchedules() {
    const { rows } = await pool.query(`
      SELECT s.*, c.name AS cell_name, u.name AS leader_name, 
             st.title AS study_title, 
             COUNT(a.id)::int AS confirmed_count
      FROM schedules s
      LEFT JOIN cells c ON c.id = s.cell_id
      LEFT JOIN users u ON u.id = s.leader_id
      LEFT JOIN studies st ON st.id = s.study_id
      LEFT JOIN attendance a ON a.schedule_id = s.id
      GROUP BY s.id, c.name, u.name, st.title
      ORDER BY s.date, s.time
    `);
    return rows;
  },

  async getUpcomingSchedules() {
    const { rows } = await pool.query(`
      SELECT s.*, c.name AS cell_name, u.name AS leader_name, 
             st.title AS study_title,
             COUNT(a.id)::int AS confirmed_count
      FROM schedules s
      LEFT JOIN cells c ON c.id = s.cell_id
      LEFT JOIN users u ON u.id = s.leader_id
      LEFT JOIN studies st ON st.id = s.study_id
      LEFT JOIN attendance a ON a.schedule_id = s.id
      WHERE s.date >= CURRENT_DATE
      GROUP BY s.id, c.name, u.name, st.title
      ORDER BY s.date, s.time
      LIMIT 20
    `);
    return rows;
  },

  async getScheduleById(id) {
    const { rows } = await pool.query(`
      SELECT s.*, c.name AS cell_name, u.name AS leader_name, 
             st.title AS study_title,
             COUNT(a.id)::int AS confirmed_count
      FROM schedules s
      LEFT JOIN cells c ON c.id = s.cell_id
      LEFT JOIN users u ON u.id = s.leader_id
      LEFT JOIN studies st ON st.id = s.study_id
      LEFT JOIN attendance a ON a.schedule_id = s.id
      WHERE s.id = $1
      GROUP BY s.id, c.name, u.name, st.title
    `, [id]);

    if (rows.length === 0) return null;

    const schedule = rows[0];

    // Buscar participantes
    const { rows: attendees } = await pool.query(`
      SELECT u.id, u.name, u.phone, a.confirmed_at
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      WHERE a.schedule_id = $1
      ORDER BY a.confirmed_at
    `, [id]);

    schedule.attendees = attendees;
    return schedule;
  },

  async createSchedule({ cell_id, title, date, time, location, leader_id, study_id, notes }) {
    const { rows } = await pool.query(
      `INSERT INTO schedules (cell_id, title, date, time, location, leader_id, study_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [cell_id || null, title, date, time, location, leader_id || null, study_id || null, notes || null]
    );
    return rows[0];
  },

  async updateSchedule(id, data) {
    const { rows } = await pool.query(
      `UPDATE schedules 
       SET cell_id = $1, title = $2, date = $3, time = $4, location = $5, 
           leader_id = $6, study_id = $7, notes = $8
       WHERE id = $9 RETURNING *`,
      [
        data.cell_id || null, data.title, data.date, data.time, data.location,
        data.leader_id || null, data.study_id || null, data.notes || null, id
      ]
    );
    return rows[0] || null;
  },

  async deleteSchedule(id) {
    await pool.query('DELETE FROM attendance WHERE schedule_id = $1', [id]);
    await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
  },

  // --- Attendance ---
  async confirmAttendance(scheduleId, userId) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO attendance (schedule_id, user_id) 
         VALUES ($1, $2) RETURNING *`,
        [scheduleId, userId]
      );
      return rows[0];
    } catch (err) {
      // Constraint UNIQUE viola = já confirmado
      if (err.code === '23505') return null;
      throw err;
    }
  },

  async cancelAttendance(scheduleId, userId) {
    await pool.query(
      'DELETE FROM attendance WHERE schedule_id = $1 AND user_id = $2',
      [scheduleId, userId]
    );
  },

  async checkAttendance(scheduleId, userId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM attendance WHERE schedule_id = $1 AND user_id = $2',
      [scheduleId, userId]
    );
    return rows.length > 0;
  },

  async getMyAttendance(userId) {
    const { rows } = await pool.query(`
      SELECT a.*, s.title, s.date, s.time, s.location
      FROM attendance a
      JOIN schedules s ON s.id = a.schedule_id
      WHERE a.user_id = $1
      ORDER BY s.date DESC
    `, [userId]);
    return rows;
  },

  // --- Finances ---
  async getFinances({ cell_id, type, start_date, end_date } = {}) {
    let query = `
      SELECT f.*, c.name AS cell_name, u.name AS created_by_name
      FROM finances f
      LEFT JOIN cells c ON c.id = f.cell_id
      LEFT JOIN users u ON u.id = f.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (cell_id) {
      query += ` AND f.cell_id = $${idx++}`;
      params.push(cell_id);
    }
    if (type) {
      query += ` AND f.type = $${idx++}`;
      params.push(type);
    }
    if (start_date) {
      query += ` AND f.date >= $${idx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND f.date <= $${idx++}`;
      params.push(end_date);
    }

    query += ' ORDER BY f.date DESC';
    const { rows } = await pool.query(query, params);
    return rows;
  },

  async getFinanceSummary(filters = {}) {
    const list = await this.getFinances(filters);

    const income = list
      .filter((f) => f.type === 'income')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);
    const expense = list
      .filter((f) => f.type === 'expense')
      .reduce((sum, f) => sum + parseFloat(f.amount), 0);

    const catMap = {};
    list.forEach((f) => {
      const key = `${f.type}:${f.category}`;
      if (!catMap[key]) catMap[key] = { type: f.type, category: f.category, total: 0, count: 0 };
      catMap[key].total += parseFloat(f.amount);
      catMap[key].count += 1;
    });

    return {
      income,
      expense,
      balance: income - expense,
      byCategory: Object.values(catMap).sort((a, b) => b.total - a.total),
    };
  },

  async createFinance({ cell_id, type, category, amount, description, date, created_by }) {
    const { rows } = await pool.query(
      `INSERT INTO finances (cell_id, type, category, amount, description, date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [cell_id || null, type, category, amount, description || null, date, created_by || null]
    );
    return rows[0];
  },

  async updateFinance(id, { cell_id, type, category, amount, description, date }) {
    const { rows } = await pool.query(
      `UPDATE finances 
       SET cell_id = $1, type = $2, category = $3, amount = $4, description = $5, date = $6
       WHERE id = $7 RETURNING *`,
      [cell_id || null, type, category, amount, description || null, date, id]
    );
    return rows[0] || null;
  },

  async deleteFinance(id) {
    await pool.query('DELETE FROM finances WHERE id = $1', [id]);
  },

  // --- Studies ---
  async getStudies({ category, search } = {}) {
    let query = `
      SELECT s.*, u.name AS created_by_name
      FROM studies s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (category) {
      query += ` AND s.category = $${idx++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (s.title ILIKE $${idx} OR s.description ILIKE $${idx} OR s.keywords ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY s.created_at DESC';
    const { rows } = await pool.query(query, params);
    return rows;
  },

  async getStudyById(id) {
    const { rows } = await pool.query(`
      SELECT s.*, u.name AS created_by_name
      FROM studies s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async getStudyCategories() {
    const { rows } = await pool.query(
      'SELECT DISTINCT category FROM studies WHERE category IS NOT NULL ORDER BY category'
    );
    return rows.map((r) => r.category);
  },

  async createStudy({ title, description, content, file_path, category, keywords, created_by }) {
    const { rows } = await pool.query(
      `INSERT INTO studies (title, description, content, file_path, category, keywords, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description || null, content || null, file_path || null, category || null, keywords || null, created_by || null]
    );
    return rows[0];
  },

  async updateStudy(id, { title, description, content, file_path, category, keywords }) {
    const existing = await this.getStudyById(id);
    if (!existing) return null;

    const { rows } = await pool.query(
      `UPDATE studies 
       SET title = $1, description = $2, content = $3, file_path = $4, category = $5, keywords = $6
       WHERE id = $7 RETURNING *`,
      [
        title, description || null, content || null,
        file_path !== undefined ? file_path : existing.file_path,
        category || null, keywords || null, id
      ]
    );
    return rows[0] || null;
  },

  async deleteStudy(id) {
    const { rows } = await pool.query('DELETE FROM studies WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  },

  // --- Meeting Attendance (reuniões geradas) ---
  async confirmMeetingAttendance(cellId, date, userId) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO meeting_attendance (cell_id, date, user_id) 
         VALUES ($1, $2, $3) RETURNING *`,
        [cellId, date, userId]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') return null; // já confirmado
      throw err;
    }
  },

  async cancelMeetingAttendance(cellId, date, userId) {
    await pool.query(
      'DELETE FROM meeting_attendance WHERE cell_id = $1 AND date = $2 AND user_id = $3',
      [cellId, date, userId]
    );
  },

  async checkMeetingAttendance(cellId, date, userId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM meeting_attendance WHERE cell_id = $1 AND date = $2 AND user_id = $3',
      [cellId, date, userId]
    );
    return rows.length > 0;
  },

  async getMeetingAttendanceCount(cellId, date) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM meeting_attendance WHERE cell_id = $1 AND date = $2',
      [cellId, date]
    );
    return rows[0].count;
  },

  async getMyMeetingAttendances(userId) {
    const { rows } = await pool.query(
      `SELECT ma.cell_id, ma.date, c.name AS cell_name
       FROM meeting_attendance ma
       JOIN cells c ON c.id = ma.cell_id
       WHERE ma.user_id = $1
       ORDER BY ma.date DESC`,
      [userId]
    );
    return rows;
  },

  async getMeetingAttendanceBatch(cellDates, userId) {
    // Recebe array de { cell_id, date } e retorna quais o user confirmou
    if (!cellDates.length) return [];
    const values = cellDates.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    const params = cellDates.flatMap(cd => [cd.cell_id, cd.date]);
    const { rows } = await pool.query(
      `SELECT cell_id, date::text FROM meeting_attendance 
       WHERE user_id = $${params.length + 1} AND (cell_id, date) IN (${values})`,
      [...params, userId]
    );
    return rows;
  },

  async getMeetingAttendanceCountBatch(cellDates) {
    // Recebe array de { cell_id, date } e retorna contagens
    if (!cellDates.length) return [];
    const values = cellDates.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    const params = cellDates.flatMap(cd => [cd.cell_id, cd.date]);
    const { rows } = await pool.query(
      `SELECT cell_id, date::text, COUNT(*)::int AS count FROM meeting_attendance 
       WHERE (cell_id, date) IN (${values})
       GROUP BY cell_id, date`,
      params
    );
    return rows;
  },

  // --- Attendance Validation (validação real de presença pelo líder) ---
  async validateAttendance(cellId, date, userIds, validatedBy) {
    // userIds = array de { user_id, was_confirmed }
    const results = [];
    for (const item of userIds) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO attendance_validation (cell_id, date, user_id, was_confirmed, validated_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (cell_id, date, user_id) DO UPDATE SET was_confirmed = $4, validated_by = $5, validated_at = NOW()
           RETURNING *`,
          [cellId, date, item.user_id, item.was_confirmed, validatedBy]
        );
        results.push(rows[0]);
      } catch (err) {
        console.error('Erro ao validar presença:', err);
      }
    }
    return results;
  },

  async removeValidatedAttendance(cellId, date, userId) {
    await pool.query(
      'DELETE FROM attendance_validation WHERE cell_id = $1 AND date = $2 AND user_id = $3',
      [cellId, date, userId]
    );
  },

  async getValidatedAttendance(cellId, date) {
    const { rows } = await pool.query(`
      SELECT av.*, u.name AS user_name, u.phone AS user_phone, vb.name AS validated_by_name
      FROM attendance_validation av
      JOIN users u ON u.id = av.user_id
      LEFT JOIN users vb ON vb.id = av.validated_by
      WHERE av.cell_id = $1 AND av.date = $2
      ORDER BY u.name
    `, [cellId, date]);
    return rows;
  },

  async getValidationHistory(cellId, limit = 50) {
    const { rows } = await pool.query(`
      SELECT av.cell_id, av.date, c.name AS cell_name,
             COUNT(*)::int AS total_present,
             COUNT(*) FILTER (WHERE av.was_confirmed)::int AS confirmed_present,
             COUNT(*) FILTER (WHERE NOT av.was_confirmed)::int AS unconfirmed_present,
             MIN(av.validated_at) AS validated_at
      FROM attendance_validation av
      JOIN cells c ON c.id = av.cell_id
      WHERE ($1::int IS NULL OR av.cell_id = $1)
      GROUP BY av.cell_id, av.date, c.name
      ORDER BY av.date DESC
      LIMIT $2
    `, [cellId || null, limit]);
    return rows;
  },

  async getValidationDetail(cellId, date) {
    const { rows } = await pool.query(`
      SELECT av.*, u.name AS user_name, u.phone AS user_phone
      FROM attendance_validation av
      JOIN users u ON u.id = av.user_id
      WHERE av.cell_id = $1 AND av.date = $2
      ORDER BY u.name
    `, [cellId, date]);
    return rows;
  },

  async getMeetingConfirmedUsers(cellId, date) {
    const { rows } = await pool.query(`
      SELECT ma.user_id, u.name, u.phone
      FROM meeting_attendance ma
      JOIN users u ON u.id = ma.user_id
      WHERE ma.cell_id = $1 AND ma.date = $2
      ORDER BY u.name
    `, [cellId, date]);
    return rows;
  },

  async isValidated(cellId, date) {
    const { rows } = await pool.query(
      'SELECT 1 FROM attendance_validation WHERE cell_id = $1 AND date = $2 LIMIT 1',
      [cellId, date]
    );
    return rows.length > 0;
  },

  // --- Helpers ---
  async scheduleExists(id) {
    const { rows } = await pool.query('SELECT 1 FROM schedules WHERE id = $1', [id]);
    return rows.length > 0;
  },
};

// ========== INICIALIZAÇÃO ==========
export async function initDatabase() {
  try {
    // Testar conexão
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexão com PostgreSQL estabelecida:', result.rows[0].now);
    console.log('✅ Banco de dados pronto!');
  } catch (err) {
    console.error('❌ Erro ao conectar com o banco de dados:', err.message);
    process.exit(1);
  }
}

export default db;
