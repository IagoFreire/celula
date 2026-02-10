import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json(await db.getFinances(req.query));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

router.get('/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    res.json(await db.getFinanceSummary(req.query));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resumo financeiro' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cell_id, type, category, amount, description, date } = req.body;
    if (!type || !category || !amount || !date) {
      return res.status(400).json({ error: 'Tipo, categoria, valor e data são obrigatórios' });
    }
    const fin = await db.createFinance({
      cell_id: cell_id ? Number(cell_id) : null,
      type, category, amount: parseFloat(amount), description, date,
      created_by: req.user.id,
    });
    res.status(201).json({ id: fin.id, message: 'Transação registrada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar transação' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cell_id, type, category, amount, description, date } = req.body;
    await db.updateFinance(Number(req.params.id), {
      cell_id: cell_id ? Number(cell_id) : null,
      type, category, amount: parseFloat(amount), description, date,
    });
    res.json({ message: 'Transação atualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.deleteFinance(Number(req.params.id));
    res.json({ message: 'Transação excluída' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
});

export default router;
