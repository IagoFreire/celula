import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin, requireAdminOrLeader } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const members = (await db.getAllUsers()).map(({ password, ...u }) => u);
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar membros' });
  }
});

router.get('/:id', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const member = await db.getUserWithHistory(Number(req.params.id));
    if (!member) return res.status(404).json({ error: 'Membro não encontrado' });
    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar membro' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    await db.updateUser(Number(req.params.id), { name, email, phone, role });
    res.json({ message: 'Membro atualizado' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email ou telefone já cadastrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar membro' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }
    await db.deleteUser(Number(req.params.id));
    res.json({ message: 'Membro excluído' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir membro' });
  }
});

export default router;
