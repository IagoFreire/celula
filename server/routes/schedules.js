import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Endpoint público - cronogramas (sem autenticação)
router.get('/public', async (req, res) => {
  try {
    // Tenta pegar próximos, se não houver pega todos
    let schedules = await db.getUpcomingSchedules();
    if (schedules.length === 0) {
      schedules = await db.getAllSchedules();
    }
    // Retorna apenas dados públicos (sem notas internas)
    const publicSchedules = schedules.map(({ id, title, date, time, location, cell_name, confirmed_count }) => ({
      id, title, date, time, location, cell_name, confirmed_count,
    }));
    res.json(publicSchedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cronogramas' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    res.json(await db.getAllSchedules());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cronogramas' });
  }
});

router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    let schedules = await db.getUpcomingSchedules();
    if (schedules.length === 0) {
      schedules = await db.getAllSchedules();
    }
    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar próximas reuniões' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const schedule = await db.getScheduleById(Number(req.params.id));
    if (!schedule) return res.status(404).json({ error: 'Cronograma não encontrado' });
    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cronograma' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cell_id, title, date, time, location, leader_id, study_id, notes } = req.body;
    if (!title || !date || !time || !location) {
      return res.status(400).json({ error: 'Título, data, horário e local são obrigatórios' });
    }
    const schedule = await db.createSchedule({
      cell_id: cell_id ? Number(cell_id) : null, title, date, time, location,
      leader_id: leader_id ? Number(leader_id) : null,
      study_id: study_id ? Number(study_id) : null, notes,
    });
    res.status(201).json({ id: schedule.id, message: 'Reunião criada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar cronograma' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cell_id, title, date, time, location, leader_id, study_id, notes } = req.body;
    await db.updateSchedule(Number(req.params.id), {
      cell_id: cell_id ? Number(cell_id) : null, title, date, time, location,
      leader_id: leader_id ? Number(leader_id) : null,
      study_id: study_id ? Number(study_id) : null, notes,
    });
    res.json({ message: 'Cronograma atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar cronograma' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.deleteSchedule(Number(req.params.id));
    res.json({ message: 'Cronograma excluído' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir cronograma' });
  }
});

export default router;
