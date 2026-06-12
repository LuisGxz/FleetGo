import { Browser, Page, expect, test } from '@playwright/test';

const PASSWORD = 'Demo1234!';
const COURIER = 'courier@fleetgo.dev';
const DISPATCH = 'dispatch@fleetgo.dev';

async function freshPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('fleetgo.lang', 'en'));
  return page;
}

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.locator('ion-input[name="email"] input').fill(email);
  await page.locator('ion-input[name="password"] input').fill(PASSWORD);
  await page.locator('ion-button[type="submit"]').click();
  await page.waitForURL(/\/(driver|dispatch)/);
}

test.describe('FleetGo E2E', () => {
  test('about page is public and bilingual', async ({ browser }) => {
    const page = await freshPage(browser);
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'About FleetGo' })).toBeVisible();
    await page.locator('.lang-pill button', { hasText: 'ES' }).click();
    await expect(page.getByRole('heading', { name: 'Acerca de FleetGo' })).toBeVisible();
    await page.close();
  });

  test('courier lands on driver app, RBAC blocks dispatch, session survives reload', async ({ browser }) => {
    const page = await freshPage(browser);
    await login(page, COURIER);
    await expect(page).toHaveURL(/\/driver/);
    await expect(page.getByText("Today's deliveries")).toBeVisible();
    await expect(page.locator('.route-line')).toContainText('R-');

    // RBAC: a courier asking for /dispatch is sent home
    await page.goto('/dispatch');
    await page.waitForURL(/\/driver/);

    // F5: the refresh-token flow restores the session
    await page.reload();
    await expect(page.getByText("Today's deliveries")).toBeVisible();

    // i18n toggle reaches the driver screens
    await page.locator('.lang-pill button', { hasText: 'ES' }).click();
    await expect(page.getByText('Entregas de hoy')).toBeVisible();
    await page.close();
  });

  test('coordinator lands on dispatch panel with KPIs, units and live map', async ({ browser }) => {
    const page = await freshPage(browser);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await login(page, DISPATCH);
    await expect(page).toHaveURL(/\/dispatch/);
    await expect(page.getByText('Live operations')).toBeVisible();
    await expect(page.getByText('Delivered today:')).toBeVisible();
    await expect(page.locator('.unit').first()).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // RBAC: a coordinator asking for /driver is sent home
    await page.goto('/driver');
    await page.waitForURL(/\/dispatch/);

    expect(errors).toEqual([]);
    await page.close();
  });

  test('courier delivers with signature and dispatch sees the update live', async ({ browser }) => {
    const dispatchPage = await freshPage(browser);
    await login(dispatchPage, DISPATCH);
    await expect(dispatchPage.locator('.unit').first()).toBeVisible();

    const unitRow = dispatchPage.locator('.unit', { hasText: 'UNIT-07' });
    await expect(unitRow).toBeVisible();
    const stopsBefore = await unitRow.locator('.stops').innerText();

    // Courier opens the next stop and resolves it
    const courierPage = await freshPage(browser);
    await login(courierPage, COURIER);
    const next = courierPage.locator('.stop.next');
    await expect(next).toBeVisible();
    await next.click();
    await courierPage.waitForURL(/\/driver\/delivery\//);
    await expect(courierPage.locator('.deliver-btn')).toBeVisible();

    // Sign when the stop requires it
    if (await courierPage.locator('app-signature-pad canvas').isVisible()) {
      const box = (await courierPage.locator('app-signature-pad canvas').boundingBox())!;
      await courierPage.mouse.move(box.x + 20, box.y + box.height / 2);
      await courierPage.mouse.down();
      await courierPage.mouse.move(box.x + box.width / 2, box.y + 20, { steps: 8 });
      await courierPage.mouse.move(box.x + box.width - 20, box.y + box.height - 25, { steps: 8 });
      await courierPage.mouse.up();
    }

    await courierPage.locator('.deliver-btn').click();
    await expect(courierPage.locator('.closed .tag.ok')).toBeVisible({ timeout: 15_000 });

    // Dispatch updates without a manual refresh (SignalR → throttled refetch)
    await expect(async () => {
      const stopsNow = await unitRow.locator('.stops').innerText();
      expect(stopsNow).not.toBe(stopsBefore);
    }).toPass({ timeout: 30_000 });

    await courierPage.close();
    await dispatchPage.close();
  });

  test('courier reports an issue and the stop closes as failed', async ({ browser }) => {
    const page = await freshPage(browser);
    await login(page, COURIER);
    const next = page.locator('.stop.next');
    await expect(next).toBeVisible();
    await next.click();
    await page.waitForURL(/\/driver\/delivery\//);

    await page.locator('.issue-btn').click();
    await expect(page.locator('.issue-sheet')).toBeVisible();
    await page.locator('.reasons button', { hasText: 'Wrong address' }).click();
    await page.locator('.issue-sheet ion-textarea textarea').fill('E2E: no such street number');
    await page.locator('.issue-sheet ion-button[color="danger"]').click();

    await expect(page.locator('.closed.failed .tag.fail')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.closed .immutable')).toBeVisible();
    await page.close();
  });
});
