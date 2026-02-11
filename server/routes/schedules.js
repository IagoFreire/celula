import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdminOrLeader } from '../middleware/auth.js';

const router = Router();

// Endpoint público - cronograma gerado das células (filtra cancelados)
router.get('/public', async (req, res) => {
  try {
    const meetings = await db.generateCellSchedule();
    const publicMeetings = meetings
      .filter(m => !m.cancelled)
      .map(({ title, date, time, location, cell_name, member_count }) => ({
        title, date, time, location, cell_name, member_count,
      }));
    res.json(publicMeetings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cronogramas' });
  }
});

// Cronograma gerado (autenticado - membro vê cancelados com aviso)
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    let meetings = await db.generateCellSchedule();
    // Membro comum vê apenas sua célula; admin e líder veem todas
    if (req.user.role === 'member' && req.user.cell_id) {
      meetings = meetings.filter(m => m.cell_id === req.user.cell_id);
    }
    res.json(meetings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar próximas reuniões' });
  }
});

// Cronograma completo (admin/líder)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let meetings = await db.generateCellSchedule();
    // Se for líder, filtrar apenas sua célula
    if (req.user.role === 'leader' && req.user.cell_id) {
      meetings = meetings.filter(m => m.cell_id === req.user.cell_id);
    }
    res.json(meetings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cronogramas' });
  }
});

// Cancelar uma reunião (admin ou líder da célula)
router.post('/cancel', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { cell_id, date, reason } = req.body;
    if (!cell_id || !date) {
      return res.status(400).json({ error: 'cell_id e date são obrigatórios' });
    }
    
    // Líder só pode cancelar da sua célula
    if (req.user.role === 'leader' && Number(cell_id) !== req.user.cell_id) {
      return res.status(403).json({ error: 'Você só pode cancelar reuniões da sua célula' });
    }
    
    const cancellation = await db.cancelSchedule(cell_id, date, reason, req.user.id);
    res.status(201).json(cancellation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cancelar reunião' });
  }
});

// Reativar uma reunião cancelada (admin ou líder da célula)
router.post('/reactivate', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { cell_id, date } = req.body;
    if (!cell_id || !date) {
      return res.status(400).json({ error: 'cell_id e date são obrigatórios' });
    }
    
    // Líder só pode reativar da sua célula
    if (req.user.role === 'leader' && Number(cell_id) !== req.user.cell_id) {
      return res.status(403).json({ error: 'Você só pode reativar reuniões da sua célula' });
    }
    
    await db.reactivateSchedule(cell_id, date);
    res.json({ message: 'Reunião reativada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reativar reunião' });
  }
});

export default router;
