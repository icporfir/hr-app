// =====================================================
// SERVER EXPRESS — PUNCTUL DE INTRARE AL BACKEND-ULUI
// =====================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRoutes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Încarcă variabilele de mediu din .env
dotenv.config();

// Echivalent __dirname pentru ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE GLOBAL =====

// Permite request-uri din frontend (alt port)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parsează JSON din body-ul request-urilor
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servește fișierele uploadate static (pentru download documente)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Log simplu pentru fiecare request (util în dezvoltare)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ===== RUTE =====

// Toate rutele API sub /api
app.use('/api', apiRoutes);

// Ruta rădăcină — mesaj de întâmpinare
app.get('/', (req, res) => {
  res.json({
    message: 'API Aplicație HR — rulează corect',
    docs: '/api/health',
  });
});

// ===== HANDLERS ERORI (trebuie să fie ULTIMELE) =====
app.use(notFound);
app.use(errorHandler);

// ===== PORNIRE SERVER =====
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log(`🚀  Server HR pornit pe portul ${PORT}`);
  console.log(`🚀  Mod: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀  URL: http://localhost:${PORT}`);
  console.log(`🚀  Health check: http://localhost:${PORT}/api/health`);
  console.log('🚀 ========================================');
  console.log('');
});