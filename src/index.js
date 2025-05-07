/**
 * Main application entry point
 *
 * @module index
 * @author Your Name <your.email@example.com>
 */

import dotenv from 'dotenv';
import express from 'express';
import { format } from 'date-fns';
import { createLogger, transports, format as winstonFormat } from 'winston';

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Configure Winston logger
 */
const logger = createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winstonFormat.combine(
    winstonFormat.timestamp(),
    winstonFormat.json()
  ),
  transports: [
    new transports.Console({
      format: winstonFormat.combine(
        winstonFormat.colorize(),
        winstonFormat.simple()
      ),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

/**
 * User service for handling user operations
 */
class UserService {
  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Object} User data
   */
  static async getUserById(id) {
    // This would typically involve a database call
    return {
      id,
      name: 'Example User',
      email: 'user@example.com',
      createdAt: new Date(),
    };
  }
}

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    });
  });

  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await UserService.getUserById(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error fetching user:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: NODE_ENV === 'production' ? null : error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: NODE_ENV === 'production' ? null : err.message,
  });

  next();
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  // Close database connections, etc.
  process.exit(0);
});

export default app;
