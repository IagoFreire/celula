import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

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
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    const cell = await db.createCell({ name, description });
    res.status(201).json({ id: cell.id, message: 'Célula criada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar célula' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    await db.updateCell(Number(req.params.id), { name, description });
    res.json({ message: 'Célula atualizada' });
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

export default router;
