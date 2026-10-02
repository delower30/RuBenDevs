// backend/src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import ridesRoutes from './routes/rides';
import driverRoutes from './routes/driver';
import zonesRoutes from './routes/zones';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint (PRD §6 Docker health checks)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'Dhaka Tesla Pool Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/zones', zonesRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
  });
});

// Start server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`⚡ Dhaka Tesla Pool API running on http://localhost:${PORT}`);
    console.log(`🚦 Health check available at http://localhost:${PORT}/health`);
  });
}
