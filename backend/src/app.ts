import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Request, Response } from 'express';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 8000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env['NODE_ENV'] === 'production' 
    ? ['https://8brain.ai', 'https://www.8brain.ai']
    : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: '8Brain API',
    version: '1.0.0'
  });
});

// Import routes
import documentsRouter from './routes/documents';
import databaseRouter from './routes/database';
import authRouter from './routes/auth';
import searchRouter from './routes/search';
import aiRouter from './routes/ai';
import graphRouter from './routes/graph';

// Import database manager for initialization
import { databaseManager } from './services/DatabaseManager';
import { migrateExistingDocuments } from './scripts/migrateDocumentMetadata';

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/database', databaseRouter);
app.use('/api/search', searchRouter);
app.use('/api/ai', aiRouter);
app.use('/api/graph', graphRouter);

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: '8Brain GraphRAG API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      database: '/api/database/*',
      documents: '/api/documents/*',
      search: '/api/search/*',
      ai: '/api/ai/*',
      graph: '/api/graph/*'
    }
  });
});

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: process.env['NODE_ENV'] === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Initialize databases and start server
async function startServer() {
  try {
    // Initialize database connections
    console.log('🔄 Starting 8Brain API server...');
    await databaseManager.initialize();
    
    // Migrate existing documents to metadata service
    migrateExistingDocuments();
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🧠 8Brain API server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 Database health: http://localhost:${PORT}/api/database/health`);
      console.log(`📈 Database stats: http://localhost:${PORT}/api/database/stats`);
      console.log(`🌟 Environment: ${process.env['NODE_ENV'] || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await databaseManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await databaseManager.close();
  process.exit(0);
});

// Start the server
startServer();

export default app;