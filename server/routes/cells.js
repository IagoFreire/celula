import { Router } from 'express';
import { db } from '../database.js';
import pool from '../db/pool.js';
import { authenticateToken, requireAdmin, requireAdminOrLeader } from '../middleware/auth.js';

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
    let cells = await db.getAllCells();
    // Se for líder, retornar apenas sua célula
    if (req.user.role === 'leader' && req.user.cell_id) {
      cells = cells.filter(c => c.id === req.user.cell_id);
    }
    res.json(cells);
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

// Admin pode editar qualquer célula, líder só a sua
router.put('/:id', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const cellId = Number(req.params.id);
    
    // Líder só pode editar sua própria célula
    if (req.user.role === 'leader' && cellId !== req.user.cell_id) {
      return res.status(403).json({ error: 'Você só pode editar sua própria célula' });
    }
    
    const { name, description, address, day_of_week, meeting_time, frequency, next_date } = req.body;
    const cell = await db.updateCell(cellId, { name, description, address, day_of_week, meeting_time, frequency, next_date });
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
// Admin pode ver membros de qualquer célula, líder só da sua
router.get('/:id/members', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const cellId = Number(req.params.id);
    
    if (req.user.role === 'leader' && cellId !== req.user.cell_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const members = await db.getCellMembers(cellId);
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar membros da célula' });
  }
});

router.post('/:id/members', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const cellId = Number(req.params.id);
    
    if (req.user.role === 'leader' && cellId !== req.user.cell_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    const member = await db.addMemberToCell(cellId, { name, phone });
    res.status(201).json(member);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Telefone já cadastrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

router.delete('/:cellId/members/:userId', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const cellId = Number(req.params.cellId);
    
    if (req.user.role === 'leader' && cellId !== req.user.cell_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    await db.removeMemberFromCell(Number(req.params.userId));
    res.json({ message: 'Membro removido da célula' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover membro da célula' });
  }
});

export default router;
