import { test, expect } from '@playwright/test';

test.describe('Authentication & Role Management', () => {
  
  test('TC001 - Engineer can sign in and reach the dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'john@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Secure Login")');
    
    // Verify dashboard redirect
    await expect(page).toHaveURL(/\/engineer/);
    await expect(page.locator('h1')).toContainText('John Smith');
  });

  test('TC002 - Unapproved user is forced to pending after login', async ({ page }) => {
    await page.goto('/');
    
    // Fill in credentials for a disabled/unapproved user
    await page.fill('input[type="email"]', 'mike@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Secure Login")');
    
    // Verify pending status message
    await expect(page).toHaveURL(/\/pending/);
    await expect(page.locator('h1')).toContainText('Account Disabled');
  });

  test('TC003 - New user registration sends user to pending approval', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in registration form
    await page.fill('input[placeholder="e.g. John Smith"]', 'New Playwright User');
    await page.fill('input[placeholder="name@company.com"]', `pw-test-${Date.now()}@example.com`);
    await page.fill('input[placeholder="Min. 8 characters"]', 'Password123!');
    await page.click('button:has-text("Office / Admin")');
    
    await page.click('button:has-text("Request Approval")');
    
    // Verify success screen
    await expect(page.locator('h1')).toContainText('Registration Sent');
  });

});
