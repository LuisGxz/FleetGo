/**
 * Captures the README screenshots against the local dev servers.
 * Run: npx tsx e2e/screenshots.ts  (or node with ts strip) — uses @playwright/test's chromium.
 */
import { chromium } from '@playwright/test';

const OUT = '../docs/screenshots';
const PASSWORD = 'Demo1234!';

async function main(): Promise<void> {
  const browser = await chromium.launch();

  // Driver app — phone viewport
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.addInitScript(() => localStorage.setItem('fleetgo.lang', 'en'));
  await phone.goto('http://localhost:4200/login');
  await phone.screenshot({ path: `${OUT}/login.png` });
  await phone.locator('ion-input[name="email"] input').fill('courier@fleetgo.dev');
  await phone.locator('ion-input[name="password"] input').fill(PASSWORD);
  await phone.locator('ion-button[type="submit"]').click();
  await phone.waitForURL(/driver/);
  await phone.waitForSelector('.stop');
  await phone.waitForTimeout(800);
  await phone.screenshot({ path: `${OUT}/driver-route.png` });

  await phone.locator('.stop.next').click();
  await phone.waitForURL(/delivery/);
  await phone.waitForSelector('.deliver-btn');
  await phone.waitForTimeout(2500); // tiles
  await phone.screenshot({ path: `${OUT}/driver-delivery.png` });
  await phone.close();

  // Dispatch panel — desktop viewport
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  await desktop.addInitScript(() => localStorage.setItem('fleetgo.lang', 'en'));
  await desktop.goto('http://localhost:4200/login');
  await desktop.locator('ion-input[name="email"] input').fill('dispatch@fleetgo.dev');
  await desktop.locator('ion-input[name="password"] input').fill(PASSWORD);
  await desktop.locator('ion-button[type="submit"]').click();
  await desktop.waitForURL(/dispatch/);
  await desktop.waitForSelector('.unit');
  await desktop.waitForTimeout(3500); // tiles + markers
  await desktop.screenshot({ path: `${OUT}/dispatch.png` });
  await desktop.close();

  await browser.close();
  console.log('screenshots done');
}

main().catch(e => { console.error(e); process.exit(1); });
