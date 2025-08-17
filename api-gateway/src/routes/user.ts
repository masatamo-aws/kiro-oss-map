/**
 * User data API routes for Kiro OSS Map API Gateway
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get user bookmarks
router.get('/bookmarks',
  requirePermission('user:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication required',
        hint: 'Include Authorization: Bearer <token> header'
      });
      return;
    }

    const resultLimit = Math.min(parseInt(limit as string) || 50, 100);
    const resultOffset = Math.max(parseInt(offset as string) || 0, 0);

    // TODO: Implement actual database query
    const bookmarks = await getUserBookmarks(userId, {
      category: category as string,
      limit: resultLimit,
      offset: resultOffset
    });

    res.json({
      bookmarks,
      total: bookmarks.length,
      limit: resultLimit,
      offset: resultOffset
    });
  })
);

// Create bookmark
router.post('/bookmarks',
  requirePermission('user:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, coordinates, category, tags = [], metadata = {} } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    if (!name || !coordinates) {
      throw new ValidationError('Name and coordinates are required');
    }

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new ValidationError('Coordinates must be [longitude, latitude]');
    }

    const [lng, lat] = coordinates;
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      throw new ValidationError('Coordinates must be numbers');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ValidationError('Invalid coordinates');
    }

    // TODO: Implement actual database insertion
    const bookmark = await createBookmark({
      userId,
      name,
      coordinates: { latitude: lat, longitude: lng },
      category,
      tags,
      metadata
    });

    logger.info('Bookmark created', {
      userId,
      bookmarkId: bookmark.id,
      name,
      category
    });

    res.status(201).json({
      message: 'Bookmark created successfully',
      bookmark
    });
  })
);

// Update bookmark
router.put('/bookmarks/:id',
  requirePermission('user:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, coordinates, category, tags, metadata } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    // TODO: Implement actual database update
    const bookmark = await updateBookmark(id, userId, {
      name,
      coordinates,
      category,
      tags,
      metadata
    });

    if (!bookmark) {
      throw new NotFoundError('Bookmark not found');
    }

    logger.info('Bookmark updated', {
      userId,
      bookmarkId: id,
      name
    });

    res.json({
      message: 'Bookmark updated successfully',
      bookmark
    });
  })
);

// Delete bookmark
router.delete('/bookmarks/:id',
  requirePermission('user:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    // TODO: Implement actual database deletion
    const deleted = await deleteBookmark(id, userId);

    if (!deleted) {
      throw new NotFoundError('Bookmark not found');
    }

    logger.info('Bookmark deleted', {
      userId,
      bookmarkId: id
    });

    res.json({
      message: 'Bookmark deleted successfully'
    });
  })
);

// Get search history
router.get('/search-history',
  requirePermission('user:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    const resultLimit = Math.min(parseInt(limit as string) || 20, 100);
    const resultOffset = Math.max(parseInt(offset as string) || 0, 0);

    // TODO: Implement actual database query
    const history = await getSearchHistory(userId, {
      limit: resultLimit,
      offset: resultOffset
    });

    res.json({
      history,
      total: history.length,
      limit: resultLimit,
      offset: resultOffset
    });
  })
);

// Clear search history
router.delete('/search-history',
  requirePermission('user:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    // TODO: Implement actual database deletion
    await clearSearchHistory(userId);

    logger.info('Search history cleared', { userId });

    res.json({
      message: 'Search history cleared successfully'
    });
  })
);

// Get user preferences
router.get('/preferences',
  requirePermission('user:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    // TODO: Implement actual database query
    const preferences = await getUserPreferences(userId);

    res.json({
      preferences
    });
  })
);

// Update user preferences
router.put('/preferences',
  requirePermission('user:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const preferences = req.body;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    // Validate preferences structure
    const validPreferences = validatePreferences(preferences);

    // TODO: Implement actual database update
    const updatedPreferences = await updateUserPreferences(userId, validPreferences);

    logger.info('User preferences updated', { userId });

    res.json({
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });
  })
);

// Get user statistics
router.get('/stats',
  requirePermission('user:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    // TODO: Implement actual statistics calculation
    const stats = await getUserStatistics(userId);

    res.json({
      stats
    });
  })
);

// Export user data (GDPR compliance)
router.get('/export',
  requirePermission('user:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    // TODO: Implement actual data export
    const exportData = await exportUserData(userId);

    logger.info('User data exported', { userId });

    res.json({
      message: 'User data export',
      exportedAt: new Date().toISOString(),
      data: exportData
    });
  })
);

// Helper functions (TODO: Replace with actual database operations)
async function getUserBookmarks(userId: string, options: any): Promise<any[]> {
  // Mock bookmarks
  const mockBookmarks = [
    {
      id: 'bookmark_1',
      name: '東京駅',
      coordinates: {
        latitude: 35.6812,
        longitude: 139.7671
      },
      category: 'station',
      tags: ['重要', '交通'],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  return mockBookmarks.filter(bookmark => 
    !options.category || bookmark.category === options.category
  ).slice(options.offset, options.offset + options.limit);
}

async function createBookmark(data: any): Promise<any> {
  return {
    id: `bookmark_${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function updateBookmark(id: string, userId: string, data: any): Promise<any> {
  // Mock update
  return {
    id,
    userId,
    ...data,
    updatedAt: new Date().toISOString()
  };
}

async function deleteBookmark(id: string, userId: string): Promise<boolean> {
  // Mock deletion
  return true;
}

async function getSearchHistory(userId: string, options: any): Promise<any[]> {
  // Mock search history
  return [
    {
      id: 'search_1',
      query: '東京駅',
      timestamp: new Date().toISOString(),
      resultCount: 5
    }
  ].slice(options.offset, options.offset + options.limit);
}

async function clearSearchHistory(userId: string): Promise<void> {
  // Mock clear
}

async function getUserPreferences(userId: string): Promise<any> {
  // Mock preferences
  return {
    language: 'ja',
    theme: 'light',
    mapStyle: 'standard',
    units: 'metric',
    notifications: {
      email: true,
      push: false
    },
    privacy: {
      shareLocation: false,
      analytics: true
    }
  };
}

async function updateUserPreferences(userId: string, preferences: any): Promise<any> {
  // Mock update
  return preferences;
}

async function getUserStatistics(userId: string): Promise<any> {
  // Mock statistics
  return {
    totalBookmarks: 15,
    totalSearches: 234,
    totalRoutes: 45,
    accountAge: 180, // days
    lastActivity: new Date().toISOString(),
    mostUsedFeatures: ['search', 'routing', 'bookmarks']
  };
}

async function exportUserData(userId: string): Promise<any> {
  // Mock export data
  return {
    profile: {
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString()
    },
    bookmarks: await getUserBookmarks(userId, { limit: 1000, offset: 0 }),
    searchHistory: await getSearchHistory(userId, { limit: 1000, offset: 0 }),
    preferences: await getUserPreferences(userId),
    statistics: await getUserStatistics(userId)
  };
}

function validatePreferences(preferences: any): any {
  const validLanguages = ['ja', 'en', 'zh', 'ko'];
  const validThemes = ['light', 'dark', 'auto'];
  const validMapStyles = ['standard', 'satellite', 'terrain'];
  const validUnits = ['metric', 'imperial'];

  const validated: any = {};

  if (preferences.language && validLanguages.includes(preferences.language)) {
    validated.language = preferences.language;
  }

  if (preferences.theme && validThemes.includes(preferences.theme)) {
    validated.theme = preferences.theme;
  }

  if (preferences.mapStyle && validMapStyles.includes(preferences.mapStyle)) {
    validated.mapStyle = preferences.mapStyle;
  }

  if (preferences.units && validUnits.includes(preferences.units)) {
    validated.units = preferences.units;
  }

  if (preferences.notifications && typeof preferences.notifications === 'object') {
    validated.notifications = {
      email: Boolean(preferences.notifications.email),
      push: Boolean(preferences.notifications.push)
    };
  }

  if (preferences.privacy && typeof preferences.privacy === 'object') {
    validated.privacy = {
      shareLocation: Boolean(preferences.privacy.shareLocation),
      analytics: Boolean(preferences.privacy.analytics)
    };
  }

  return validated;
}

export { router as userRoutes };