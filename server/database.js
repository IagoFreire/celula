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
    const { rows } = await pool.query('SELECT * FROM cells ORDER BY name');
    return rows;
  },

  async createCell({ name, description }) {
    const { rows } = await pool.query(
      'INSERT INTO cells (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    return rows[0];
  },

  async updateCell(id, { name, description }) {
    const { rows } = await pool.query(
      'UPDATE cells SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || null, id]
    );
    return rows[0] || null;
  },

  async deleteCell(id) {
    await pool.query('DELETE FROM cells WHERE id = $1', [id]);
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
