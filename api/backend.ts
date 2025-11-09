import express from 'express';
import cors from 'cors';
import authRoutes from '../backend/src/routes/auth';
import apiRoutes from '../backend/src/routes/api';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export для Vercel serverless
export default app;

