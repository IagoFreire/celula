import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/:scheduleId', authenticateToken, async (req, res) => {
  try {
    const scheduleId = Number(req.params.scheduleId);
    if (!(await db.scheduleExists(scheduleId))) {
      return res.status(404).json({ error: 'Reunião não encontrada' });
    }
    const result = await db.confirmAttendance(scheduleId, req.user.id);
    if (!result) return res.status(409).json({ error: 'Presença já confirmada' });
    res.status(201).json({ message: 'Presença confirmada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao confirmar presença' });
  }
});

router.delete('/:scheduleId', authenticateToken, async (req, res) => {
  try {
    await db.cancelAttendance(Number(req.params.scheduleId), req.user.id);
    res.json({ message: 'Presença cancelada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cancelar presença' });
  }
});

router.get('/check/:scheduleId', authenticateToken, async (req, res) => {
  try {
    res.json({ confirmed: await db.checkAttendance(Number(req.params.scheduleId), req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao verificar presença' });
  }
});

router.get('/my', authenticateToken, async (req, res) => {
  try {
    res.json(await db.getMyAttendance(req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar presenças' });
  }
});

// ======= Meeting Attendance (reuniões geradas por célula) =======

// Confirmar presença em reunião gerada
router.post('/meeting/confirm', authenticateToken, async (req, res) => {
  try {
    const { cell_id, date } = req.body;
    if (!cell_id || !date) {
      return res.status(400).json({ error: 'cell_id e date são obrigatórios' });
    }
    const result = await db.confirmMeetingAttendance(cell_id, date, req.user.id);
    if (!result) return res.status(409).json({ error: 'Presença já confirmada' });
    res.status(201).json({ message: 'Presença confirmada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao confirmar presença' });
  }
});

// Cancelar presença em reunião gerada
router.delete('/meeting/cancel', authenticateToken, async (req, res) => {
  try {
    const { cell_id, date } = req.body;
    if (!cell_id || !date) {
      return res.status(400).json({ error: 'cell_id e date são obrigatórios' });
    }
    await db.cancelMeetingAttendance(cell_id, date, req.user.id);
    res.json({ message: 'Presença cancelada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cancelar presença' });
  }
});

// Verificar presença em reunião gerada (batch - para múltiplas reuniões)
router.post('/meeting/check-batch', authenticateToken, async (req, res) => {
  try {
    const { meetings } = req.body; // array de { cell_id, date }
    if (!meetings || !Array.isArray(meetings)) {
      return res.status(400).json({ error: 'meetings é obrigatório (array de { cell_id, date })' });
    }
    const confirmed = await db.getMeetingAttendanceBatch(meetings, req.user.id);
    const counts = await db.getMeetingAttendanceCountBatch(meetings);
    res.json({ confirmed, counts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao verificar presenças' });
  }
});

export default router;
