import { test, expect } from '@playwright/test';

test.describe('Engineer Workflows', () => {

  test.beforeEach(async ({ page }) => {
    // Log in as engineer
    await page.goto('/');
    await page.fill('input[type="email"]', 'john@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Secure Login")');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('TC011 - Logging a consumption event', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/dashboard/profile');
    
    await page.click('#simulate-existing-btn');
    await page.click('button:has-text("Continue")');
    await page.waitForURL(/\/dashboard\/bottle\/8849201A/);
    
    // Inline Transfer to Site
    await page.click('button:has-text("Job Site")');
    await page.fill('input[placeholder="e.g. JOB-88219"]', 'TC011-SITE');
    await page.click('button:has-text("Confirm Transfer")');
    
    // BottleActionHub success screen uses "Done"
    await page.waitForSelector('button:has-text("Done")');
    await page.click('button:has-text("Done")');
    
    // Now back on bottle page (refreshed), click Log Gas Usage
    await page.click('h3:has-text("Log Gas Usage")');
    await page.waitForURL(/\/dashboard\/log/);
    
    await page.fill('input[placeholder="e.g. JOB-88219"]', 'TC011-SITE');
    await page.fill('input[placeholder="e.g. Daikin, Mitsubishi"]', 'Test Manufacturer');
    await page.fill('input[placeholder="e.g. FDTC50VF"]', 'Test Model');
    await page.fill('input[placeholder="e.g. 9948201B"]', 'ASSET-123');
    await page.fill('input[placeholder="e.g. 1.5"]', '0.5');
    
    await page.click('button:has-text("Save Compliance Log")');
    await expect(page.locator('h2')).toContainText('Log Saved Successfully!', { timeout: 15000 });
  });

  test('TC012 - Create a new HWCN (Reclaim Flow)', async ({ page }) => {
    test.slow();
    await page.goto('/dashboard/profile');
    
    await page.click('#simulate-reclaim-btn');
    await page.click('button:has-text("Continue")');
    await page.waitForURL(/\/dashboard\/bottle\/REC-402/);
    
    // Full Page Transfer to Van from Site
    await page.click('h3:has-text("Transfer Bottle into Van")');
    await page.waitForURL(/\/dashboard\/move/);
    
    // Intercepted by reclaim question
    await page.click('button:has-text("No, Transfer to Alternative Location")');
    
    // Now on move page with "Van" destination
    await page.click('button:has-text("Confirm Transfer")');
    
    // MoveBottlePage success screen uses "Return to Dashboard"
    await page.waitForSelector('button:has-text("Return to Dashboard")');
    await page.click('button:has-text("Return to Dashboard")');
    
    // Back to bottle page
    await page.goto('/dashboard/bottle/REC-402');
    
    // Now it's in Van, it uses the inline transfer UI.
    // Click "Office" destination
    await page.click('button:has-text("Office")');
    
    // Click "Confirm Transfer" to trigger the inline HWCN generation
    await page.click('button:has-text("Confirm Transfer")');
    
    // The inline transfer automatically generates the HWCN in the background
    // and displays a success screen with a button to view it.
    await expect(page.locator('text=View Digital HWCN')).toBeVisible({ timeout: 15000 });
  });

  test('TC007 - Switching roles updates dashboard', async ({ page }) => {
    await expect(page.locator('text=My Van')).toBeVisible();
    
    // Switch to Office
    await page.click('button:has-text("Switch to Office")');
    // It might show "Access Denied" if not admin, or Dashboard if allowed.
    // We just want to see that it navigates away and we can come back.
    await page.waitForURL(/\/admin/);
    
    // Switch back to Field Mode
    const backBtn = page.locator('button:has-text("Switch to Field Mode"), button:has-text("Back to Field Mode")');
    await backBtn.first().click();
    
    await page.waitForURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('John Smith');
  });

});
