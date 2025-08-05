import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable not set');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      return next();
    }

    // Try to verify token, but don't fail if invalid
    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName
      };
    } catch (error) {
      // Invalid token, but continue without authentication
      console.warn('Optional auth failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};

export const requireRole = (_roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // For now, all authenticated users have basic access
      // In the future, you could add role checking from database
      return next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization failed'
      });
    }
  };
};

export const generateToken = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}): string => {
  const jwtSecret = process.env['JWT_SECRET'];
  const jwtExpiresIn = process.env['JWT_EXPIRES_IN'] || '7d';
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not set');
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn } as jwt.SignOptions
  );
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Generate new token with current user data
    const newToken = generateToken(req.user);

    return res.json({
      success: true,
      data: {
        token: newToken,
        user: req.user
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

// Rate limiting for authentication endpoints
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
};