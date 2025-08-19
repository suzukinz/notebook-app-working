import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(workspaces);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createWorkspaceSchema.parse(req.body);
    
    const workspace = await prisma.workspace.create({
      data: {
        ...data,
        userId: req.userId!,
      },
    });

    res.status(201).json(workspace);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        notebooks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'ワークスペースが見つかりません' });
    }

    res.json(workspace);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = createWorkspaceSchema.parse(req.body);
    
    const workspace = await prisma.workspace.updateMany({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      data,
    });

    if (workspace.count === 0) {
      return res.status(404).json({ error: 'ワークスペースが見つかりません' });
    }

    const updated = await prisma.workspace.findUnique({
      where: { id: req.params.id },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const deleted = await prisma.workspace.deleteMany({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'ワークスペースが見つかりません' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;