import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth';
import workspacesRouter from './routes/workspaces';
import notebooksRouter from './routes/notebooks';
import notesRouter from './routes/notes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(rateLimiter);

app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/notebooks', notebooksRouter);
app.use('/api/notes', notesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});