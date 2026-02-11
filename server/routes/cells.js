import { Router } from 'express';
import { db } from '../database.js';
import pool from '../db/pool.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Endpoint público - lista de células para seleção (sem autenticação)
router.get('/public', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, address FROM cells ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar células' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    res.json(await db.getAllCells());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar células' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, address, day_of_week, meeting_time, frequency, next_date } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    const cell = await db.createCell({ name, description, address, day_of_week, meeting_time, frequency, next_date });
    res.status(201).json(cell);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar célula' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, address, day_of_week, meeting_time, frequency, next_date } = req.body;
    const cell = await db.updateCell(Number(req.params.id), { name, description, address, day_of_week, meeting_time, frequency, next_date });
    res.json(cell);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar célula' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.deleteCell(Number(req.params.id));
    res.json({ message: 'Célula excluída' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir célula' });
  }
});

// --- Membros da célula ---
router.get('/:id/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const members = await db.getCellMembers(Number(req.params.id));
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar membros da célula' });
  }
});

router.post('/:id/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    const member = await db.addMemberToCell(Number(req.params.id), { name, phone });
    res.status(201).json(member);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Telefone já cadastrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

router.delete('/:cellId/members/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.removeMemberFromCell(Number(req.params.userId));
    res.json({ message: 'Membro removido da célula' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover membro da célula' });
  }
});

export default router;
