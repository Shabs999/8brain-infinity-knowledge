import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/AuthService';
import { authenticateToken, refreshToken, authRateLimit } from '../middleware/auth';

const router = express.Router();
const authService = new AuthService();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit(authRateLimit);

// User registration endpoint
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        required: ['email', 'password', 'firstName', 'lastName']
      });
    }

    // Register user
    const result = await authService.registerUser({
      email,
      password,
      firstName,
      lastName
    });

    // Store email mapping for demo purposes
    await authService.storeUserEmail(result.user.id, result.user.email);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          createdAt: result.user.createdAt
        },
        token: result.token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    const message = error instanceof Error ? error.message : 'Registration failed';
    const statusCode = message.includes('already exists') ? 409 : 
                      message.includes('Invalid') || message.includes('must be') ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      message
    });
  }
});

// User login endpoint
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Login user
    const result = await authService.loginUser({ email, password });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName
        },
        token: result.token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    const message = error instanceof Error ? error.message : 'Login failed';
    const statusCode = message.includes('Invalid') ? 401 : 500;

    return res.status(statusCode).json({
      success: false,
      message
    });
  }
});

// Token refresh endpoint
router.post('/refresh', authenticateToken, refreshToken);

// Get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get full user details
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { firstName, lastName } = req.body;

    // Validate input
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // For now, return success message
    // In production, this would update the database
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          ...req.user,
          firstName: firstName.trim(),
          lastName: lastName.trim()
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Change password endpoint
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Change password
    await authService.changePassword(req.user.id, currentPassword, newPassword);

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to change password';
    const statusCode = message.includes('incorrect') || message.includes('Invalid') ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      message
    });
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // In a production app with token blacklisting, you'd add the token to a blacklist here
    // For JWT tokens, logout is typically handled client-side by removing the token
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Check authentication status
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      data: {
        authenticated: true,
        user: req.user
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: {
        authenticated: false
      }
    });
  }
});

export default router;