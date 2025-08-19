import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const createNoteSchema = z.object({
  subfolderId: z.string().uuid(),
  title: z.string().min(1).max(255),
  pages: z.array(z.object({
    title: z.string().min(1).max(255),
    content: z.string(),
  })).optional(),
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

router.use(authenticate);

router.get('/subfolder/:subfolderId', async (req: AuthRequest, res, next) => {
  try {
    const subfolderWithOwnership = await prisma.subFolder.findUnique({
      where: { id: req.params.subfolderId },
      include: {
        notebook: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!subfolderWithOwnership || subfolderWithOwnership.notebook.workspace.userId !== req.userId) {
      return res.status(404).json({ error: 'サブフォルダが見つかりません' });
    }

    const notes = await prisma.note.findMany({
      where: { subfolderId: req.params.subfolderId },
      include: {
        pages: {
          orderBy: { position: 'asc' },
        },
        noteTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    const formattedNotes = notes.map(note => ({
      ...note,
      tags: note.noteTags.map(nt => nt.tag),
      noteTags: undefined,
    }));

    res.json(formattedNotes);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createNoteSchema.parse(req.body);
    
    const subfolderWithOwnership = await prisma.subFolder.findUnique({
      where: { id: data.subfolderId },
      include: {
        notebook: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!subfolderWithOwnership || subfolderWithOwnership.notebook.workspace.userId !== req.userId) {
      return res.status(403).json({ error: 'このサブフォルダへのアクセス権限がありません' });
    }

    const note = await prisma.note.create({
      data: {
        subfolderId: data.subfolderId,
        title: data.title,
        pages: data.pages ? {
          create: data.pages.map((page, index) => ({
            title: page.title,
            content: page.content,
            position: index,
          })),
        } : {
          create: {
            title: 'Page 1',
            content: '',
            position: 0,
          },
        },
      },
      include: {
        pages: {
          orderBy: { position: 'asc' },
        },
        noteTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const formattedNote = {
      ...note,
      tags: note.noteTags.map(nt => nt.tag),
      noteTags: undefined,
    };

    res.status(201).json(formattedNote);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      include: {
        pages: {
          orderBy: { position: 'asc' },
        },
        noteTags: {
          include: {
            tag: true,
          },
        },
        subfolder: {
          include: {
            notebook: {
              include: {
                workspace: true,
              },
            },
          },
        },
      },
    });

    if (!note || note.subfolder.notebook.workspace.userId !== req.userId) {
      return res.status(404).json({ error: 'ノートが見つかりません' });
    }

    const formattedNote = {
      ...note,
      tags: note.noteTags.map(nt => nt.tag),
      noteTags: undefined,
      subfolder: undefined,
    };

    res.json(formattedNote);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = updateNoteSchema.parse(req.body);
    
    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      include: {
        subfolder: {
          include: {
            notebook: {
              include: {
                workspace: true,
              },
            },
          },
        },
      },
    });

    if (!note || note.subfolder.notebook.workspace.userId !== req.userId) {
      return res.status(404).json({ error: 'ノートが見つかりません' });
    }

    const updated = await prisma.note.update({
      where: { id: req.params.id },
      data,
      include: {
        pages: {
          orderBy: { position: 'asc' },
        },
        noteTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const formattedNote = {
      ...updated,
      tags: updated.noteTags.map(nt => nt.tag),
      noteTags: undefined,
    };

    res.json(formattedNote);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      include: {
        subfolder: {
          include: {
            notebook: {
              include: {
                workspace: true,
              },
            },
          },
        },
      },
    });

    if (!note || note.subfolder.notebook.workspace.userId !== req.userId) {
      return res.status(404).json({ error: 'ノートが見つかりません' });
    }

    await prisma.note.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;