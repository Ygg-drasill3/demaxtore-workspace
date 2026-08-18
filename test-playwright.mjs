import { chromium } from 'playwright';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true
  });
  const page = await browser.newPage();
  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000');
  console.log('Page title:', await page.title());
  await browser.close();
}

run().catch(console.error);
