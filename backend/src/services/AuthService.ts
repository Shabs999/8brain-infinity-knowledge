import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { databaseManager } from './DatabaseManager';
import { generateToken } from '../middleware/auth';

export interface UserRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  private saltRounds = 12;

  async registerUser(userData: UserRegistration): Promise<{
    user: User;
    token: string;
  }> {
    try {
      // Validate input
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        throw new Error('All fields are required');
      }

      if (!this.validateEmail(userData.email)) {
        throw new Error('Invalid email format');
      }

      if (!this.validatePassword(userData.password)) {
        throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, and number');
      }

      // Check if user already exists (in production, this would be a database query)
      // For now, we'll create a simple in-memory check using the user ID generation
      const existingUserId = await this.findUserByEmail(userData.email);
      if (existingUserId) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, this.saltRounds);

      // Create user
      const userId = uuidv4();
      const now = new Date();
      
      const user: User = {
        id: userId,
        email: userData.email.toLowerCase().trim(),
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        createdAt: now,
        updatedAt: now
      };

      // Store user in graph database if available
      try {
        const graphService = databaseManager.getGraphService();
        await graphService.createUser(userId, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt
        });
        console.log(`✅ User ${user.email} created in Neo4j`);
      } catch (error) {
        console.warn('⚠️  Failed to create user in Neo4j:', error instanceof Error ? error.message : 'Unknown error');
        // Continue without Neo4j - user still created
      }

      // Store password hash (in production, this would be in a secure database)
      await this.storePasswordHash(userId, hashedPassword);

      // Generate JWT token
      const token = generateToken(user);

      return { user, token };
    } catch (error) {
      console.error('User registration error:', error);
      throw error;
    }
  }

  async loginUser(credentials: UserLogin): Promise<{
    user: User;
    token: string;
  }> {
    try {
      // Validate input
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      // Find user by email
      const userId = await this.findUserByEmail(credentials.email);
      if (!userId) {
        throw new Error('Invalid email or password');
      }

      // Get stored password hash
      const storedHash = await this.getPasswordHash(userId);
      if (!storedHash) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, storedHash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Get user details
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate JWT token
      const token = generateToken(user);

      return { user, token };
    } catch (error) {
      console.error('User login error:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      // In production, this would query your user database
      // For now, we'll create a mock user based on stored data
      const email = await this.getStoredUserEmail(userId);
      if (!email) {
        return null;
      }

      // Mock user data - in production, retrieve from database
      return {
        id: userId,
        email: email,
        firstName: 'Demo',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Validate new password
      if (!this.validatePassword(newPassword)) {
        throw new Error('New password must be at least 8 characters long and contain uppercase, lowercase, and number');
      }

      // Verify current password
      const storedHash = await this.getPasswordHash(userId);
      if (!storedHash) {
        throw new Error('User not found');
      }

      const isValidPassword = await bcrypt.compare(currentPassword, storedHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newHashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

      // Store new password hash
      await this.storePasswordHash(userId, newHashedPassword);

      console.log(`✅ Password changed for user ${userId}`);
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // Simple in-memory storage for demo purposes
  // In production, these would be database operations
  private userEmails = new Map<string, string>(); // userId -> email
  private emailToUserId = new Map<string, string>(); // email -> userId
  private passwordHashes = new Map<string, string>(); // userId -> hashedPassword

  private async findUserByEmail(email: string): Promise<string | null> {
    return this.emailToUserId.get(email.toLowerCase().trim()) || null;
  }

  private async storePasswordHash(userId: string, hashedPassword: string): Promise<void> {
    this.passwordHashes.set(userId, hashedPassword);
  }

  private async getPasswordHash(userId: string): Promise<string | null> {
    return this.passwordHashes.get(userId) || null;
  }

  private async getStoredUserEmail(userId: string): Promise<string | null> {
    return this.userEmails.get(userId) || null;
  }

  // Store user email mapping for demo
  async storeUserEmail(userId: string, email: string): Promise<void> {
    this.userEmails.set(userId, email);
    this.emailToUserId.set(email.toLowerCase().trim(), userId);
  }
}