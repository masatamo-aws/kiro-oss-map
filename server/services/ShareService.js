/**
 * Share service for managing shared URLs and data
 */
export class ShareService {
  constructor() {
    // In-memory storage for demo purposes
    // In production, use Redis or a database
    this.shares = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  async createShare(type, data, expiresIn = 2592000000) { // 30 days in ms
    const id = this.generateId();
    const now = Date.now();
    const expiresAt = now + expiresIn;
    
    const shareData = {
      id,
      type,
      data,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      accessCount: 0
    };
    
    this.shares.set(id, shareData);
    
    return {
      id,
      url: this.generateUrl(id),
      expiresAt: shareData.expiresAt
    };
  }

  async getShare(id) {
    const shareData = this.shares.get(id);
    
    if (!shareData) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > new Date(shareData.expiresAt).getTime()) {
      this.shares.delete(id);
      return null;
    }
    
    // Increment access count
    shareData.accessCount++;
    
    return {
      type: shareData.type,
      data: shareData.data,
      createdAt: shareData.createdAt,
      expiresAt: shareData.expiresAt
    };
  }

  async deleteShare(id) {
    return this.shares.delete(id);
  }

  async updateShare(id, data) {
    const shareData = this.shares.get(id);
    
    if (!shareData) {
      return null;
    }
    
    shareData.data = { ...shareData.data, ...data };
    return shareData;
  }

  generateId() {
    // Generate a random 8-character ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateUrl(id) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}?share=${id}`;
  }

  cleanup() {
    const now = Date.now();
    const expired = [];
    
    for (const [id, shareData] of this.shares.entries()) {
      if (now > new Date(shareData.expiresAt).getTime()) {
        expired.push(id);
      }
    }
    
    expired.forEach(id => {
      this.shares.delete(id);
    });
    
    if (expired.length > 0) {
      console.log(`Cleaned up ${expired.length} expired shares`);
    }
  }

  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    let totalAccess = 0;
    
    for (const shareData of this.shares.values()) {
      if (now > new Date(shareData.expiresAt).getTime()) {
        expired++;
      } else {
        active++;
      }
      totalAccess += shareData.accessCount;
    }
    
    return {
      active,
      expired,
      total: active + expired,
      totalAccess
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.shares.clear();
  }
}