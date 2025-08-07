import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import { collaborationService } from './services/CollaborationService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const httpServer = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
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
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: '8Brain API',
    version: '1.0.0'
  });
});

// API Routes
import collaborationRoutes from './routes/collaboration';
app.use('/api/collaboration', collaborationRoutes);

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: '8Brain GraphRAG API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      documents: '/api/documents/*',
      ai: '/api/ai/*',
      graph: '/api/graph/*'
    }
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Initialize WebSocket server for collaboration
collaborationService.initialize(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🧠 8Brain API server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤝 WebSocket server ready for collaborative sessions`);
  console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;