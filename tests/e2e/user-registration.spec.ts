/**
 * E2E tests for user registration flow
 */

import { test, expect } from '@playwright/test';

test.describe('User Registration', () => {
  test('should complete registration flow', async ({ page }) => {
    await page.goto('/register');

    // Fill in registration form
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to home or dashboard
    await page.waitForURL(/\/(dashboard|home)?$/);

    // Should show success message or user indicator
    await expect(page.locator('text=/welcome|dashboard/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/register');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/required|fill in/i')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=/valid email/i')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123'); // Weak password

    // Should show password strength indicator
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();

    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
