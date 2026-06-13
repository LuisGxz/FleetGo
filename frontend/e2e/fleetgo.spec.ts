import { Browser, Page, expect, test } from '@playwright/test';

const PASSWORD = 'Demo1234!';
const COURIER = 'courier@fleetgo.dev';
const DISPATCH = 'dispatch@fleetgo.dev';

interface TrackedPage {
  page: Page;
  /** pageerror + console.error collected — asserted empty when the test closes the page. */
  errors: string[];
}

async function freshPage(browser: Browser, opts: { showTours?: boolean } = {}): Promise<TrackedPage> {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Flow tests pre-mark the guided tours as seen so the overlay never intercepts clicks;
  // the dedicated tour test opts back in with { showTours: true }.
  await page.addInitScript((show: boolean) => {
    localStorage.setItem('fleetgo.lang', 'en');
    if (!show) {
      ['driver', 'driver-delivery', 'dispatch'].forEach(id =>
        localStorage.setItem(`fleetgo.tour.${id}`, '1'));
    }
  }, opts.showTours ?? false);

  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`);
  });
  return { page, errors };
}

async function closeClean(tracked: TrackedPage): Promise<void> {
  expect(tracked.errors).toEqual([]);
  await tracked.page.close();
}

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.locator('ion-input[name="email"] input').fill(email);
  await page.locator('ion-input[name="password"] input').fill(PASSWORD);
  await page.locator('ion-button[type="submit"]').click();
  await page.waitForURL(/\/(driver|dispatch)/);
}

test.describe('FleetGo E2E', () => {
  test('about page is public, bilingual and complete', async ({ browser }) => {
    const t = await freshPage(browser);
    await t.page.goto('/about');
    await expect(t.page.getByRole('heading', { name: 'About this project' })).toBeVisible();
    // The interviewer sections required by the portfolio standard:
    for (const heading of ['Scope', 'Architecture', 'Design patterns', 'Authentication & security', 'Testing']) {
      await expect(t.page.getByRole('heading', { name: heading, exact: false })).toBeVisible();
    }
    await expect(t.page.locator('table tbody tr')).not.toHaveCount(0);

    await t.page.locator('.lang-pill button', { hasText: 'ES' }).click();
    await expect(t.page.getByRole('heading', { name: 'Sobre este proyecto' })).toBeVisible();
    await closeClean(t);
  });

  test('courier lands on driver app, RBAC blocks dispatch, session survives reload', async ({ browser }) => {
    const t = await freshPage(browser);
    await login(t.page, COURIER);
    await expect(t.page).toHaveURL(/\/driver/);
    await expect(t.page.getByText("Today's deliveries")).toBeVisible();
    await expect(t.page.locator('.route-line')).toContainText('R-');

    // RBAC: a courier asking for /dispatch is sent home
    await t.page.goto('/dispatch');
    await t.page.waitForURL(/\/driver/);

    // F5: the refresh-token flow restores the session
    await t.page.reload();
    await expect(t.page.getByText("Today's deliveries")).toBeVisible();

    // i18n toggle reaches the driver screens
    await t.page.locator('.lang-pill button', { hasText: 'ES' }).click();
    await expect(t.page.getByText('Entregas de hoy')).toBeVisible();
    await closeClean(t);
  });

  test('coordinator lands on dispatch panel with KPIs, units and live map', async ({ browser }) => {
    const t = await freshPage(browser);
    await login(t.page, DISPATCH);
    await expect(t.page).toHaveURL(/\/dispatch/);
    await expect(t.page.getByText('Live operations')).toBeVisible();
    await expect(t.page.getByText('Delivered today:')).toBeVisible();
    await expect(t.page.locator('.unit').first()).toBeVisible();
    await expect(t.page.locator('.leaflet-container')).toBeVisible();

    // RBAC: a coordinator asking for /driver is sent home
    await t.page.goto('/driver');
    await t.page.waitForURL(/\/dispatch/);
    await closeClean(t);
  });

  test('courier delivers with signature and dispatch sees the update live', async ({ browser }) => {
    const dispatch = await freshPage(browser);
    await login(dispatch.page, DISPATCH);
    await expect(dispatch.page.locator('.unit').first()).toBeVisible();

    const unitRow = dispatch.page.locator('.unit', { hasText: 'UNIT-07' });
    await expect(unitRow).toBeVisible();
    const stopsBefore = await unitRow.locator('.stops').innerText();

    // Courier opens the next stop and resolves it
    const courier = await freshPage(browser);
    await login(courier.page, COURIER);
    const next = courier.page.locator('.stop.next');
    await expect(next).toBeVisible();
    await next.click();
    await courier.page.waitForURL(/\/driver\/delivery\//);
    await expect(courier.page.locator('.deliver-btn')).toBeVisible();

    // Sign when the stop requires it — wait for the mini-map/layout to settle so the
    // canvas receives pointer events, then assert the ink actually registered.
    if (await courier.page.locator('app-signature-pad canvas').isVisible()) {
      await courier.page.waitForTimeout(900);
      const box = (await courier.page.locator('app-signature-pad canvas').boundingBox())!;
      await courier.page.mouse.move(box.x + 25, box.y + box.height / 2);
      await courier.page.mouse.down();
      await courier.page.mouse.move(box.x + box.width / 2, box.y + 18, { steps: 10 });
      await courier.page.mouse.move(box.x + box.width - 25, box.y + box.height - 22, { steps: 10 });
      await courier.page.mouse.up();
      await expect(courier.page.locator('app-signature-pad .pad.signed')).toBeVisible();
    }

    await courier.page.locator('.deliver-btn').click();
    await expect(courier.page.locator('.closed .tag.ok')).toBeVisible({ timeout: 15_000 });

    // Dispatch updates without a manual refresh (SignalR → throttled refetch)
    await expect(async () => {
      const stopsNow = await unitRow.locator('.stops').innerText();
      expect(stopsNow).not.toBe(stopsBefore);
    }).toPass({ timeout: 30_000 });

    await closeClean(courier);
    await closeClean(dispatch);
  });

  test('guided demo layer: tour auto-starts, role badge and how-to-explore guide', async ({ browser }) => {
    const t = await freshPage(browser, { showTours: true });
    await login(t.page, COURIER);

    // First-run tour auto-starts as spotlight coach-marks
    const card = t.page.locator('.coach-card');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.locator('.step-count')).toHaveText('1 / 3');
    await card.locator('.primary').click();
    await expect(card.locator('.step-count')).toHaveText('2 / 3');
    await card.locator('.primary').click();
    await card.locator('.primary').click(); // "Got it" on the last step finishes
    await expect(t.page.locator('.tour-overlay')).toHaveCount(0);

    // Role badge explains what this role can / can't do (the RBAC story)
    await t.page.locator('app-role-badge .badge').click();
    const pop = t.page.locator('app-role-badge .pop');
    await expect(pop).toBeVisible();
    await expect(pop).toContainText('your own daily route');
    await pop.locator('.x').click();

    // How-to-explore guide lists role scenarios and can replay the tour
    await t.page.locator('app-demo-guide .help-btn').click();
    await expect(t.page.locator('.sheet')).toBeVisible();
    await expect(t.page.locator('.sheet .scenarios li')).toHaveCount(4);
    await t.page.locator('.sheet .replay').click();
    await expect(card).toBeVisible(); // tour replayed on demand
    await card.locator('.skip').click();
    await expect(t.page.locator('.tour-overlay')).toHaveCount(0);

    await closeClean(t);
  });

  test('courier reports an issue and the stop closes as failed', async ({ browser }) => {
    const t = await freshPage(browser);
    await login(t.page, COURIER);
    const next = t.page.locator('.stop.next');
    await expect(next).toBeVisible();
    await next.click();
    await t.page.waitForURL(/\/driver\/delivery\//);

    await t.page.locator('.issue-btn').click();
    await expect(t.page.locator('.issue-sheet')).toBeVisible();
    await t.page.locator('.reasons button', { hasText: 'Wrong address' }).click();
    await t.page.locator('.issue-sheet ion-textarea textarea').fill('E2E: no such street number');
    await t.page.locator('.issue-sheet ion-button[color="danger"]').click();

    await expect(t.page.locator('.closed.failed .tag.fail')).toBeVisible({ timeout: 15_000 });
    await expect(t.page.locator('.closed .immutable')).toBeVisible();
    await closeClean(t);
  });
});
