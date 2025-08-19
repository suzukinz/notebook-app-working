import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const createNotebookSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
  position: z.number().optional(),
});

router.use(authenticate);

router.get('/workspace/:workspaceId', async (req: AuthRequest, res, next) => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.workspaceId,
        userId: req.userId,
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'ワークスペースが見つかりません' });
    }

    const notebooks = await prisma.notebook.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: {
        subfolders: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    res.json(notebooks);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createNotebookSchema.parse(req.body);
    
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: data.workspaceId,
        userId: req.userId,
      },
    });

    if (!workspace) {
      return res.status(403).json({ error: 'このワークスペースへのアクセス権限がありません' });
    }

    const notebook = await prisma.notebook.create({
      data,
      include: {
        subfolders: true,
      },
    });

    res.status(201).json(notebook);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { workspaceId, ...updateData } = createNotebookSchema.parse(req.body);
    
    const notebook = await prisma.notebook.findUnique({
      where: { id: req.params.id },
      include: { workspace: true },
    });

    if (!notebook || notebook.workspace.userId !== req.userId) {
      return res.status(404).json({ error: 'ノートブックが見つかりません' });
    }

    const updated = await prisma.notebook.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        subfolders: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const notebook = await prisma.notebook.findUnique({
      where: { id: req.params.id },
      include: { workspace: true },
    });

    if (!notebook || notebook.workspace.userId !== req.userId) {
      return res.status(404).json({ error: 'ノートブックが見つかりません' });
    }

    await prisma.notebook.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;