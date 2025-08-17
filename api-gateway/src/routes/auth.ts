/**
 * Authentication routes for Kiro OSS Map API Gateway
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { asyncHandler, ValidationError, AuthenticationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// User registration
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, organizationName } = req.body;

  // Validate input
  if (!email || !password || !name) {
    throw new ValidationError('Email, password, and name are required');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  // TODO: Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ValidationError('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // TODO: Create user and organization in database
  const user = await createUser({
    email,
    password: hashedPassword,
    name,
    organizationName
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  logger.info('User registered', { userId: user.id, email: user.email });

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn
    }
  });
}));

// User login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  // TODO: Find user in database
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new AuthenticationError('Account is inactive');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // TODO: Update last login timestamp
  await updateLastLogin(user.id);

  logger.info('User logged in', { userId: user.id, email: user.email });

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role: user.role
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn
    }
  });
}));

// Get current user info
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  // This route would typically use auth middleware
  // For now, extract token manually
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new AuthenticationError('Authentication token is required');
  }

  const decoded = jwt.verify(token, config.jwt.secret) as any;
  const user = await findUserById(decoded.sub);

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role: user.role,
      createdAt: user.createdAt
    }
  });
}));

// Helper functions
function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' }, config.jwt.secret, { expiresIn: '1h' });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, config.jwt.secret, { expiresIn: '7d' });
}

// Mock database functions (TODO: Replace with actual database calls)
const mockUsers: any[] = [];

async function findUserByEmail(email: string): Promise<any> {
  // Check mock users first
  const mockUser = mockUsers.find(user => user.email === email);
  if (mockUser) {
    return mockUser;
  }

  // Default test user
  if (email === 'existing@example.com') {
    return {
      id: 'user-123',
      email: 'existing@example.com',
      name: 'Existing User',
      password: await bcrypt.hash('password123', 12), // password123
      organizationId: 'org-123',
      role: 'developer',
      isActive: true,
      createdAt: new Date()
    };
  }
  return null;
}

async function findUserById(userId: string): Promise<any> {
  // Check mock users first
  const mockUser = mockUsers.find(user => user.id === userId);
  if (mockUser) {
    return mockUser;
  }

  // Default test user
  if (userId === 'user-123') {
    return {
      id: 'user-123',
      email: 'existing@example.com',
      name: 'Existing User',
      organizationId: 'org-123',
      role: 'developer',
      isActive: true,
      createdAt: new Date()
    };
  }
  return null;
}

async function createUser(userData: any): Promise<any> {
  // Mock implementation
  const newUser = {
    id: 'user-' + Date.now(),
    email: userData.email,
    name: userData.name,
    password: userData.password,
    organizationId: 'org-' + Date.now(),
    role: 'developer',
    isActive: true,
    createdAt: new Date()
  };
  
  // Add to mock users array
  mockUsers.push(newUser);
  
  return newUser;
}

async function updateLastLogin(userId: string): Promise<void> {
  // Mock implementation
  logger.debug('Updated last login for user', { userId });
}

export { router as authRoutes };