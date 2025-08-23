const { test, expect } = require('@playwright/test');

test.describe('Map E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');
  });

  test('should load map successfully', async ({ page }) => {
    // Wait for map container to be visible
    await expect(page.locator('#map')).toBeVisible();
    
    // Check if MapLibre GL is loaded
    const mapLoaded = await page.evaluate(() => {
      return window.maplibregl !== undefined;
    });
    expect(mapLoaded).toBe(true);
    
    // Check if map instance exists
    const mapInstance = await page.evaluate(() => {
      return window.map !== undefined;
    });
    expect(mapInstance).toBe(true);
  });

  test('should perform search functionality', async ({ page }) => {
    // Click search input
    await page.click('#search-input');
    
    // Type search query
    await page.fill('#search-input', 'Tokyo Station');
    
    // Wait for search suggestions
    await page.waitForSelector('.search-suggestions', { timeout: 5000 });
    
    // Click first suggestion
    await page.click('.search-suggestions .suggestion-item:first-child');
    
    // Wait for map to update
    await page.waitForTimeout(2000);
    
    // Check if marker is added to map
    const markerExists = await page.evaluate(() => {
      return document.querySelector('.maplibregl-marker') !== null;
    });
    expect(markerExists).toBe(true);
  });

  test('should handle route calculation', async ({ page }) => {
    // Open route panel
    await page.click('[data-testid="route-button"]');
    
    // Wait for route panel to be visible
    await expect(page.locator('#route-panel')).toBeVisible();
    
    // Set origin
    await page.fill('#route-origin', 'Tokyo Station');
    await page.waitForTimeout(1000);
    await page.press('#route-origin', 'Enter');
    
    // Set destination
    await page.fill('#route-destination', 'Shibuya Station');
    await page.waitForTimeout(1000);
    await page.press('#route-destination', 'Enter');
    
    // Click calculate route
    await page.click('#calculate-route');
    
    // Wait for route to be calculated
    await page.waitForSelector('.route-line', { timeout: 10000 });
    
    // Check if route is displayed
    const routeExists = await page.evaluate(() => {
      return document.querySelector('.route-line') !== null;
    });
    expect(routeExists).toBe(true);
    
    // Check if route info is displayed
    await expect(page.locator('.route-info')).toBeVisible();
  });

  test('should handle bookmark functionality', async ({ page }) => {
    // Search for a location first
    await page.fill('#search-input', 'Shibuya');
    await page.waitForSelector('.search-suggestions');
    await page.click('.search-suggestions .suggestion-item:first-child');
    await page.waitForTimeout(2000);
    
    // Open bookmark panel
    await page.click('[data-testid="bookmark-button"]');
    await expect(page.locator('#bookmark-panel')).toBeVisible();
    
    // Add bookmark
    await page.click('#add-bookmark');
    await page.fill('#bookmark-name', 'Test Bookmark');
    await page.selectOption('#bookmark-category', 'favorites');
    await page.click('#save-bookmark');
    
    // Check if bookmark is added
    await page.waitForSelector('.bookmark-item');
    const bookmarkText = await page.textContent('.bookmark-item .bookmark-name');
    expect(bookmarkText).toBe('Test Bookmark');
  });

  test('should handle theme switching', async ({ page }) => {
    // Click theme toggle
    await page.click('[data-testid="theme-toggle"]');
    
    // Wait for theme change
    await page.waitForTimeout(1000);
    
    // Check if dark theme is applied
    const isDarkTheme = await page.evaluate(() => {
      return document.body.classList.contains('dark-theme');
    });
    expect(isDarkTheme).toBe(true);
    
    // Switch back to light theme
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(1000);
    
    const isLightTheme = await page.evaluate(() => {
      return !document.body.classList.contains('dark-theme');
    });
    expect(isLightTheme).toBe(true);
  });

  test('should handle mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile menu is visible
    await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
    
    // Click mobile menu
    await page.click('.mobile-menu-toggle');
    
    // Check if mobile menu panel opens
    await expect(page.locator('.mobile-menu-panel')).toBeVisible();
    
    // Check if map is still functional
    await expect(page.locator('#map')).toBeVisible();
    
    // Test touch gestures (simulate)
    const mapElement = page.locator('#map');
    await mapElement.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    
    // Map should still be responsive
    const mapStillExists = await page.evaluate(() => {
      return window.map !== undefined;
    });
    expect(mapStillExists).toBe(true);
  });

  test('should handle offline functionality', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Reload page
    await page.reload();
    
    // Check if offline message is displayed
    await expect(page.locator('.offline-message')).toBeVisible();
    
    // Check if cached map tiles are still available
    const mapVisible = await page.locator('#map').isVisible();
    expect(mapVisible).toBe(true);
    
    // Go back online
    await context.setOffline(false);
    
    // Check if online functionality is restored
    await page.waitForTimeout(2000);
    const onlineIndicator = await page.locator('.online-indicator').isVisible();
    expect(onlineIndicator).toBe(true);
  });
});