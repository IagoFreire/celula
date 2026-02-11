import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database.js';
import pool from '../db/pool.js';
import { JWT_SECRET, authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await db.findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, cell_id: user.cell_id || null },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, cell_id: user.cell_id || null },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registro
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (await db.findUserByEmail(email)) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await db.createUser({ name, email, password: hashedPassword, phone, role: 'member' });

    const token = jwt.sign(
      { id: user.id, name, email, role: 'member' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name, email, role: 'member' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login por celular (sem senha)
router.post('/phone-login', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Número de celular é obrigatório' });
    }

    const user = await db.findUserByPhone(phone);
    if (!user) {
      return res.status(404).json({ error: 'not_found', message: 'Número não cadastrado' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, cell_id: user.cell_id || null },
      needs_cell: !user.cell_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registro por celular (sem senha)
router.post('/phone-register', async (req, res) => {
  try {
    const { name, phone, cell_id } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e celular são obrigatórios' });
    }

    // Verifica se já existe
    const existing = await db.findUserByPhone(phone);
    if (existing) {
      return res.status(409).json({ error: 'Número já cadastrado' });
    }

    // Membros entram apenas pelo celular, sem email/senha
    const user = await db.createUser({ name, email: null, password: null, phone, role: 'member' });

    // Se cell_id foi informado, associar à célula
    if (cell_id) {
      await pool.query('UPDATE users SET cell_id = $1 WHERE id = $2', [cell_id, user.id]);
      user.cell_id = cell_id;
    }

    const token = jwt.sign(
      { id: user.id, name, phone, role: 'member' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name, phone, role: 'member', cell_id: user.cell_id || null },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Selecionar célula (para membros que ainda não têm célula)
router.post('/select-cell', authenticateToken, async (req, res) => {
  try {
    const { cell_id } = req.body;
    if (!cell_id) {
      return res.status(400).json({ error: 'Célula é obrigatória' });
    }

    await pool.query('UPDATE users SET cell_id = $1 WHERE id = $2', [cell_id, req.user.id]);

    const user = await db.findUserById(req.user.id);
    const { password, ...safeUser } = user;

    res.json({ user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao selecionar célula' });
  }
});

// Dados do usuário logado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === LÍDERES ===

// Admin cria um líder de célula
router.post('/leaders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, cell_id } = req.body;
    if (!email || !password || !cell_id) {
      return res.status(400).json({ error: 'Email, senha e célula são obrigatórios' });
    }

    if (await db.findUserByEmail(email)) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Buscar nome da célula para usar como nome do líder (pode ser alterado depois)
    const { rows: cellRows } = await pool.query('SELECT name FROM cells WHERE id = $1', [cell_id]);
    if (cellRows.length === 0) {
      return res.status(404).json({ error: 'Célula não encontrada' });
    }
    
    const name = `Líder - ${cellRows[0].name}`;
    const user = await db.createUser({ name, email, password: hashedPassword, phone: null, role: 'leader' });
    
    // Associar à célula
    await pool.query('UPDATE users SET cell_id = $1 WHERE id = $2', [cell_id, user.id]);
    // Definir como líder da célula
    await pool.query('UPDATE cells SET leader_id = $1 WHERE id = $2', [user.id, cell_id]);

    res.status(201).json({
      id: user.id,
      name,
      email,
      role: 'leader',
      cell_id: Number(cell_id),
      message: 'Líder criado com sucesso',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar líder' });
  }
});

// Listar líderes (admin)
router.get('/leaders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.cell_id, u.created_at, c.name AS cell_name
      FROM users u
      LEFT JOIN cells c ON c.id = u.cell_id
      WHERE u.role = 'leader'
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar líderes' });
  }
});

// Excluir líder (admin)
router.delete('/leaders/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    // Remover como líder da célula
    await pool.query('UPDATE cells SET leader_id = NULL WHERE leader_id = $1', [userId]);
    // Excluir o usuário
    await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [userId, 'leader']);
    res.json({ message: 'Líder excluído com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir líder' });
  }
});

// Alterar senha (líder ou admin próprio)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (new_password.length < 4) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 4 caracteres' });
    }

    const user = await db.findUserById(req.user.id);
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Usuário não encontrado ou sem senha definida' });
    }

    if (!bcrypt.compareSync(current_password, user.password)) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

export default router;
