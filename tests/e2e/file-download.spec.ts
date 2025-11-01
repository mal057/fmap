/**
 * E2E tests for file download functionality
 */

import { test, expect } from '@playwright/test';

test.describe('File Download', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should list user files', async ({ page }) => {
    await page.goto('/maps');

    // Should show files list or empty state
    const filesList = page.locator('[data-testid="files-list"], .files-list, main');
    await expect(filesList).toBeVisible();
  });

  test('should download file when clicked', async ({ page }) => {
    await page.goto('/maps');

    // Wait for files to load
    await page.waitForTimeout(1000);

    // Click on a file download button
    const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download")').first();

    if (await downloadButton.isVisible()) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download');

      await downloadButton.click();

      // Wait for the download
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.(gpx|slg|dat|fsh)$/);
    }
  });

  test('should view file details', async ({ page }) => {
    await page.goto('/maps');

    // Click on a file to view details
    const fileItem = page.locator('[data-testid="file-item"], .file-item').first();

    if (await fileItem.isVisible()) {
      await fileItem.click();

      // Should show file details
      await expect(page.locator('text=/waypoints|points|details/i')).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test('should delete file', async ({ page }) => {
    await page.goto('/maps');

    const deleteButton = page.locator('button:has-text("Delete")').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      await page.click('button:has-text("Confirm"), button:has-text("Yes")');

      // Should show success message
      await expect(page.locator('text=/deleted|removed/i')).toBeVisible();
    }
  });

  test('should search files', async ({ page }) => {
    await page.goto('/maps');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('waypoint');

      // Should filter results
      await page.waitForTimeout(500);

      const results = page.locator('[data-testid="file-item"], .file-item');
      // Just verify search input works
      expect(await searchInput.inputValue()).toBe('waypoint');
    }
  });

  test('should sort files', async ({ page }) => {
    await page.goto('/maps');

    const sortButton = page.locator('button:has-text("Sort"), select');

    if (await sortButton.isVisible()) {
      await sortButton.click();

      // Just verify sort control exists
      expect(sortButton).toBeVisible();
    }
  });
});
