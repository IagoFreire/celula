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

export default router;
