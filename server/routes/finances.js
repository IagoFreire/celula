import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdminOrLeader } from '../middleware/auth.js';

const router = Router();

// Helper: se for líder, forçar filtro pela célula dele
function applyLeaderScope(req, filters = {}) {
  if (req.user.role === 'leader' && req.user.cell_id) {
    filters.cell_id = req.user.cell_id;
  }
  return filters;
}

router.get('/', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const filters = applyLeaderScope(req, { ...req.query });
    res.json(await db.getFinances(filters));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

router.get('/summary', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const filters = applyLeaderScope(req, { ...req.query });
    res.json(await db.getFinanceSummary(filters));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resumo financeiro' });
  }
});

router.post('/', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { cell_id, type, category, amount, description, date } = req.body;
    if (!type || !category || !amount || !date) {
      return res.status(400).json({ error: 'Tipo, categoria, valor e data são obrigatórios' });
    }
    
    // Líder só pode criar para sua célula
    let finalCellId = cell_id ? Number(cell_id) : null;
    if (req.user.role === 'leader') {
      finalCellId = req.user.cell_id;
    }
    
    const fin = await db.createFinance({
      cell_id: finalCellId,
      type, category, amount: parseFloat(amount), description, date,
      created_by: req.user.id,
    });
    res.status(201).json({ id: fin.id, message: 'Transação registrada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar transação' });
  }
});

router.put('/:id', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { cell_id, type, category, amount, description, date } = req.body;
    
    // Líder só pode editar da sua célula
    let finalCellId = cell_id ? Number(cell_id) : null;
    if (req.user.role === 'leader') {
      finalCellId = req.user.cell_id;
    }
    
    await db.updateFinance(Number(req.params.id), {
      cell_id: finalCellId,
      type, category, amount: parseFloat(amount), description, date,
    });
    res.json({ message: 'Transação atualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

router.delete('/:id', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    await db.deleteFinance(Number(req.params.id));
    res.json({ message: 'Transação excluída' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
});

export default router;
