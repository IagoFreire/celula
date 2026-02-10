import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'studies');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowedTypes.includes(ext));
  },
});

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    res.json(await db.getStudies(req.query));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estudos' });
  }
});

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    res.json(await db.getStudyCategories());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const study = await db.getStudyById(Number(req.params.id));
    if (!study) return res.status(404).json({ error: 'Estudo não encontrado' });
    res.json(study);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estudo' });
  }
});

router.post('/', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, content, category, keywords } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const filePath = req.file ? `/uploads/studies/${req.file.filename}` : null;
    const study = await db.createStudy({
      title, description, content, file_path: filePath, category, keywords,
      created_by: req.user.id,
    });
    res.status(201).json({ id: study.id, message: 'Estudo criado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar estudo' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, content, category, keywords } = req.body;
    const existing = await db.getStudyById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Estudo não encontrado' });

    let filePath = existing.file_path;
    if (req.file) {
      if (existing.file_path) {
        const oldPath = path.join(__dirname, '..', '..', existing.file_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      filePath = `/uploads/studies/${req.file.filename}`;
    }

    await db.updateStudy(Number(req.params.id), {
      title, description, content, file_path: filePath, category, keywords,
    });
    res.json({ message: 'Estudo atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar estudo' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const study = await db.deleteStudy(Number(req.params.id));
    if (study?.file_path) {
      const filePath = path.join(__dirname, '..', '..', study.file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ message: 'Estudo excluído' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir estudo' });
  }
});

export default router;
