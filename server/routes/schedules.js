import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

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
    res.json(await db.generateCellSchedule());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar próximas reuniões' });
  }
});

// Cronograma completo (admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    res.json(await db.generateCellSchedule());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cronogramas' });
  }
});

// Cancelar uma reunião
router.post('/cancel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cell_id, date, reason } = req.body;
    if (!cell_id || !date) {
      return res.status(400).json({ error: 'cell_id e date são obrigatórios' });
    }
    const cancellation = await db.cancelSchedule(cell_id, date, reason, req.user.id);
    res.status(201).json(cancellation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cancelar reunião' });
  }
});

// Reativar uma reunião cancelada
router.post('/reactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cell_id, date } = req.body;
    if (!cell_id || !date) {
      return res.status(400).json({ error: 'cell_id e date são obrigatórios' });
    }
    await db.reactivateSchedule(cell_id, date);
    res.json({ message: 'Reunião reativada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reativar reunião' });
  }
});

export default router;
