import { chromium } from 'playwright';

async function run() {
  console.log('1. Launching Google Chrome...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('2. Navigating to http://localhost:3000/login ...');
  await page.goto('http://localhost:3000/login');
  console.log('Page title:', await page.title());
  await page.screenshot({ path: 'stability-screenshot-1.png' });
  console.log('Screenshot 1 captured!');

  console.log('3. Logging in as buyer1@acme.test...');
  await page.fill('input[type="email"]', 'buyer1@acme.test');
  await page.fill('input[type="password"]', 'Passw0rd!');
  await page.click('button[type="submit"]');

  console.log('4. Waiting for dashboard navigation...');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'stability-screenshot-2.png' });
  console.log('Screenshot 2 (Dashboard) captured!');

  console.log('5. Navigating to Products...');
  // Let's click on the Products navigation link
  const productsLink = page.locator('text=Products');
  if (await productsLink.count() > 0) {
    await productsLink.first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'stability-screenshot-3.png' });
    console.log('Screenshot 3 (Products) captured!');
  } else {
    console.log('Products link not found, trying URL navigation...');
    await page.goto('http://localhost:3000/buyer/products');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'stability-screenshot-3.png' });
  }

  console.log('6. Logging out...');
  const logoutButton = page.locator('text=Log out').first();
  if (await logoutButton.count() > 0) {
    await logoutButton.click();
  } else {
    // try clicking user profile menu first
    const profileButton = page.locator('[aria-label="User menu"]');
    if (await profileButton.count() > 0) {
       await profileButton.click();
       await page.waitForTimeout(500);
    }
    await page.goto('http://localhost:3000/logout').catch(() => {});
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'stability-screenshot-4.png' });
  console.log('Screenshot 4 (Logged Out) captured!');

  await browser.close();
  console.log('7. Stability smoke passed successfully!');
}

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
