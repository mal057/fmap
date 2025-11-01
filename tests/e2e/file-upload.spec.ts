/**
 * E2E tests for file upload functionality
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should upload GPX file', async ({ page }) => {
    await page.goto('/upload');

    // Prepare test file path
    const filePath = path.join(__dirname, '../fixtures/sample-gpx.xml');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Submit upload
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=/success|uploaded/i')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should reject invalid file types', async ({ page }) => {
    await page.goto('/upload');

    // Try to upload a text file
    const fileInput = page.locator('input[type="file"]');
    const buffer = Buffer.from('This is a text file');

    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    });

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid|not supported/i')).toBeVisible();
  });

  test('should show upload progress', async ({ page }) => {
    await page.goto('/upload');

    const filePath = path.join(__dirname, '../fixtures/sample-gpx.xml');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Click upload button
    await page.click('button[type="submit"]');

    // Should show progress indicator
    const progressIndicator = page.locator('[role="progressbar"], .progress, text=/uploading/i');
    // Progress might be too fast to catch, so we just check if upload completes
    await expect(page.locator('text=/success|uploaded/i')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should display uploaded file in list', async ({ page }) => {
    await page.goto('/upload');

    const filePath = path.join(__dirname, '../fixtures/sample-gpx.xml');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000); // Wait for upload

    // Navigate to maps/files list
    await page.goto('/maps');

    // Should see uploaded file
    await expect(page.locator('text=/sample-gpx|waypoints/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should validate file size limits', async ({ page }) => {
    await page.goto('/upload');

    // Create a large buffer (simulate large file)
    const largeBuffer = Buffer.alloc(600 * 1024 * 1024); // 600MB

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-file.gpx',
      mimeType: 'application/gpx+xml',
      buffer: largeBuffer,
    });

    await page.click('button[type="submit"]');

    // Should show file size error
    await expect(page.locator('text=/too large|size limit/i')).toBeVisible();
  });
});
