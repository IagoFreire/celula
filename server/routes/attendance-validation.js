import { Router } from 'express';
import { db } from '../database.js';
import pool from '../db/pool.js';
import { authenticateToken, requireAdminOrLeader } from '../middleware/auth.js';

const router = Router();

// Buscar reuniões da célula para validar presença (passadas + hoje)
router.get('/meetings/:cellId', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const cellId = Number(req.params.cellId);

    // Líder só pode ver da sua célula
    if (req.user.role === 'leader' && cellId !== req.user.cell_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Gerar cronograma com reuniões passadas (últimos 3 meses + hoje)
    const allMeetings = await db.generateCellScheduleWithPast(cellId, 3);
    
    // Filtrar apenas não-canceladas
    const meetings = allMeetings.filter(m => !m.cancelled);

    // Verificar quais já foram validadas
    const result = [];
    for (const m of meetings) {
      const validated = await db.isValidated(cellId, m.date);
      result.push({ ...m, validated });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar reuniões' });
  }
});

// Buscar quem confirmou presença + membros da célula para uma reunião
router.get('/prepare/:cellId/:date', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const cellId = Number(req.params.cellId);
    const { date } = req.params;

    if (req.user.role === 'leader' && cellId !== req.user.cell_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Quem confirmou presença na reunião
    const confirmed = await db.getMeetingConfirmedUsers(cellId, date);

    // Todos os membros da célula
    const allMembers = await db.getCellMembers(cellId);

    // Quem já foi validado (se já tiver validação)
    const validated = await db.getValidatedAttendance(cellId, date);

    res.json({ confirmed, allMembers, validated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao preparar validação' });
  }
});

// Salvar validação de presença
router.post('/validate', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { cell_id, date, attendees } = req.body;
    // attendees = [{ user_id: number, was_confirmed: boolean }]

    if (!cell_id || !date || !attendees || !Array.isArray(attendees)) {
      return res.status(400).json({ error: 'cell_id, date e attendees são obrigatórios' });
    }

    if (req.user.role === 'leader' && Number(cell_id) !== req.user.cell_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Primeiro remove validações anteriores para esta reunião (para permitir atualização)
    await pool.query(
      'DELETE FROM attendance_validation WHERE cell_id = $1 AND date = $2',
      [cell_id, date]
    );

    // Salvar novas validações
    const results = await db.validateAttendance(cell_id, date, attendees, req.user.id);

    res.status(201).json({ message: 'Presença validada com sucesso', count: results.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao validar presença' });
  }
});

// Histórico de validações (admin vê todas, líder vê da sua célula)
router.get('/history', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const cellId = req.user.role === 'leader' ? req.user.cell_id : (req.query.cell_id ? Number(req.query.cell_id) : null);
    const history = await db.getValidationHistory(cellId);
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// Detalhe de uma validação específica
router.get('/detail/:cellId/:date', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const cellId = Number(req.params.cellId);
    const { date } = req.params;

    if (req.user.role === 'leader' && cellId !== req.user.cell_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const detail = await db.getValidationDetail(cellId, date);
    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar detalhe' });
  }
});

export default router;
