import { expect, test } from '@playwright/test';

test('login -> create cause -> donate -> ledger entry appears', async ({ page }) => {
  let authed = false;
  let createdCauseId = 101;
  let causes = [
    {
      id: 1,
      title: 'Starter Cause',
      description: 'Initial seeded cause',
      goal_eth: 10,
      raised_eth: 0,
    },
  ];
  const ledger: Array<{
    id: string;
    kind: 'donation_in' | 'disbursement_out';
    fromDisplayName: string;
    fromMasked: string;
    toDisplayName: string;
    toMasked: string;
    amountEth: string;
    causeName: string;
    txHash: string;
    recordedAt: string;
  }> = [];

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (path === '/api/auth/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: authed
            ? {
                id: 1,
                name: 'Haha',
                email: 'haha@letsdonate.local',
                role: 'admin',
                anvilIndex: 1,
                address: '0x1111111111111111111111111111111111111111',
                addressMasked: '0x1111…1111',
              }
            : null,
        }),
      });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      authed = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 1,
            name: 'Haha',
            email: 'haha@letsdonate.local',
            role: 'admin',
            anvilIndex: 1,
            address: '0x1111111111111111111111111111111111111111',
            addressMasked: '0x1111…1111',
          },
        }),
      });
    }

    if (path === '/api/causes' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(causes),
      });
    }

    if (path === '/api/causes' && method === 'POST') {
      const body = req.postDataJSON() as { title: string; description: string; goalEth: number };
      createdCauseId += 1;
      causes = [
        {
          id: createdCauseId,
          title: body.title,
          description: body.description,
          goal_eth: body.goalEth,
          raised_eth: 0,
        },
        ...causes,
      ];
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: createdCauseId }),
      });
    }

    if (path.startsWith('/api/causes/') && method === 'GET') {
      const id = Number(path.split('/').pop());
      const cause = causes.find((c) => c.id === id);
      if (!cause) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Cause not found' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cause),
      });
    }

    if (path === '/api/donate' && method === 'POST') {
      const body = req.postDataJSON() as { causeId: number; amountEth: string };
      const cause = causes.find((c) => c.id === body.causeId);
      if (cause) {
        cause.raised_eth += Number(body.amountEth);
      }
      ledger.push({
        id: String(ledger.length + 1),
        kind: 'donation_in',
        fromDisplayName: 'Haha',
        fromMasked: '0x1111…1111',
        toDisplayName: 'Super Rich vault',
        toMasked: '0x0000…0000',
        amountEth: body.amountEth,
        causeName: cause?.title ?? 'Unknown',
        txHash: `0xtesthash${ledger.length + 1}`,
        recordedAt: new Date().toISOString(),
      });
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ txHash: `0xtesthash${ledger.length}`, amountEth: body.amountEth }),
      });
    }

    if (path === '/api/ledger' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ledger),
      });
    }

    if (path === '/api/config' || path === '/api/overview') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unhandled mock route' }),
    });
  });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto('/admin/causes/new');
  await page.locator('input').first().fill('Emergency Relief');
  await page.locator('textarea').first().fill('Rapid support fund');
  await page.locator('input[type="number"]').first().fill('12');
  await page.getByRole('button', { name: 'Create cause' }).click();
  await expect(page).toHaveURL(/\/causes\/\d+$/);

  await page.getByPlaceholder('Amount').fill('0.5');
  await page.getByRole('button', { name: 'Donate' }).click();
  await expect(page.getByText('Sent')).toBeVisible();

  await page.goto('/ledger');
  await expect(page.getByText('Emergency Relief')).toBeVisible();
});
