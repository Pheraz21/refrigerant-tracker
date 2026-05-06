import { test, expect } from '@playwright/test';

test.describe('Admin Portal Management', () => {

  test.beforeEach(async ({ page }) => {
    // Log in as admin
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Secure Login")');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('TC004 - Approve a pending registration', async ({ page }) => {
    // Register as Office user
    await page.goto('/signup');
    const testEmail = `pw-approve-${Date.now()}@example.com`;
    await page.fill('input[placeholder="e.g. John Smith"]', 'Approval Test User');
    await page.fill('input[placeholder="name@company.com"]', testEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', 'Password123!');
    await page.click('button:has-text("Office / Admin")');
    await page.click('button:has-text("Request Approval")');
    await expect(page.locator('h1')).toContainText('Registration Sent');

    // Now go back to admin
    await page.goto('/admin/users');
    
    // Find the user row and click Approve
    const row = page.locator('tr', { hasText: testEmail }).last();
    await row.getByRole('button', { name: 'Approve' }).click();
    
    // Verify user is no longer in pending section
    await expect(page.locator('h2:has-text("Pending Approval")').locator(`text=${testEmail}`)).not.toBeVisible();
  });

  test('TC008 - Reject a pending registration', async ({ page }) => {
    // Register as Office user
    await page.goto('/signup');
    const testEmail = `pw-reject-${Date.now()}@example.com`;
    await page.fill('input[placeholder="e.g. John Smith"]', 'Reject Test User');
    await page.fill('input[placeholder="name@company.com"]', testEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', 'Password123!');
    await page.click('button:has-text("Office / Admin")');
    await page.click('button:has-text("Request Approval")');
    await expect(page.locator('h1')).toContainText('Registration Sent');

    await page.goto('/admin/users');
    
    // Find the user row and click Reject
    const row = page.locator('tr', { hasText: testEmail }).last();
    await row.getByRole('button', { name: 'Reject' }).click();
    
    // Verify user moves to Rejected section
    await expect(page.locator('h2:has-text("Rejected / Disabled Accounts")')).toBeVisible();
  });

  test('TC005 - Block non-admin users from admin portal', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    
    await page.goto('/');
    await page.fill('input[type="email"]', 'john@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Secure Login")');
    await expect(page).toHaveURL(/\/engineer/);
    
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin$/);
  });

});
