import { chromium } from 'playwright';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  console.log('Navigating to http://localhost:3000/welcome...');
  await page.goto('http://localhost:3000/welcome', { waitUntil: 'networkidle' });
  
  // Wait another 3 seconds
  await page.waitForTimeout(3000);
  
  console.log('Getting page HTML...');
  const html = await page.content();
  console.log('HTML length:', html.length);
  
  // Find all links on the welcome page
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(el => ({
      text: el.innerText,
      href: el.href
    }));
  });
  console.log('Links found:', links);

  // Find all buttons on the welcome page
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(el => ({
      text: el.innerText,
      className: el.className
    }));
  });
  console.log('Buttons found:', buttons);

  await browser.close();
}

run().catch(console.error);
