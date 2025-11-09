// Vercel Serverless Function Entry Point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from '../src/routes/auth';
import apiRoutes from '../src/routes/api';

dotenv.config();

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

// Export для Vercel
export default app;


