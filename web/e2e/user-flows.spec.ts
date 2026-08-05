import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  BROAD_CUTOFF,
  installApiMocks,
  L1_CUTOFF,
  L1_MODALITY_NAME,
} from './fixtures/api';
import { enterValidScores, selectVerifiedL1Course } from './fixtures/flows';

test('resolve Medicina/UFGD 2026 por ID de L1 sem substituir Ampla', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await selectVerifiedL1Course(page);

  const comparison = page.getByRole('region', { name: 'Resumo da comparação' });
  await expect(comparison).toContainText(L1_CUTOFF.toFixed(2).replace('.', ','));
  await expect(comparison).not.toContainText(BROAD_CUTOFF.toFixed(2).replace('.', ','));
  await expect(comparison).toContainText('edição 2026');
  const trustPanel = page.getByRole('region', { name: 'Confiabilidade desta referência' });
  await expect(trustPanel.getByText(L1_MODALITY_NAME, { exact: true })).toBeVisible();
});

test('exibe estado vazio da busca', async ({ page }) => {
  await installApiMocks(page, { emptySearch: true });
  await page.goto('/');
  await page.getByLabel('Curso, instituição ou cidade').fill('Odontologia');

  await expect(page.getByRole('status')).toContainText('Nenhuma oferta encontrada.');
  await expect(page.getByRole('list', { name: 'Resultados da busca' })).toHaveCount(0);
});

test('recupera a cobertura após resposta 500 e retry', async ({ page }) => {
  const mockState = await installApiMocks(page, { coverageFailures: 1 });
  await page.goto('/');

  const alert = page.getByRole('alert').filter({ hasText: 'Falha simulada de cobertura.' });
  await expect(alert).toBeVisible();
  await alert.getByRole('button', { name: 'Tentar novamente' }).click();

  await expect(alert).toHaveCount(0);
  const coverage = page.getByRole('region', { name: 'Cobertura medida da base' });
  const offersStat = coverage.getByText('Ofertas', { exact: true }).locator('..');
  await expect(offersStat).toContainText('1');
  expect(mockState.coverageAttempts()).toBe(2);
});

test('aborta cobertura lenta por timeout e permite retry', async ({ page }) => {
  const mockState = await installApiMocks(page, { coverageTimeoutFailures: 1 });
  await page.goto('/');

  const alert = page.getByRole('alert').filter({
    hasText: 'A consulta excedeu o tempo limite. Tente novamente.',
  });
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await alert.getByRole('button', { name: 'Tentar novamente' }).click();

  await expect(alert).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Cobertura medida da base' })).toContainText('1');
  expect(mockState.coverageAttempts()).toBe(2);
});

test('ignora a resposta antiga em uma corrida de busca', async ({ page }) => {
  const mockState = await installApiMocks(page, { racingSearch: true });
  await page.goto('/');
  const search = page.getByLabel('Curso, instituição ou cidade');

  await search.fill('Med');
  await expect.poll(() => mockState.searchQueries()).toContain('med');
  await search.fill('Medicina');

  const results = page.getByRole('list', { name: 'Resultados da busca' });
  await expect(results).toContainText('UFGD');
  await expect.poll(() => mockState.searchQueries()).toContain('medicina');
  await page.waitForTimeout(1_100);
  await expect(results).toContainText('UFGD');
  await expect(results).not.toContainText('Universidade Antiga');
});

test('não tem violações Axe serious/critical no fluxo verificado', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await selectVerifiedL1Course(page);
  await enterValidScores(page);

  const scan = await new AxeBuilder({ page }).analyze();
  const blockingViolations = scan.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(
    blockingViolations,
    blockingViolations
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
      .join('\n'),
  ).toEqual([]);
});

test('fecha o Radar verificado com Escape e devolve o foco', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await selectVerifiedL1Course(page);
  await enterValidScores(page);

  const openRadar = page.getByRole('button', { name: 'Radar de ofertas' });
  await expect(openRadar).toBeEnabled();
  await openRadar.click();

  const dialog = page.getByRole('dialog', { name: /Radar de ofertas — Medicina/ });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Edição 2026');
  await page.keyboard.press('Escape');

  await expect(dialog).toHaveCount(0);
  await expect(openRadar).toBeFocused();
});
