import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  BROAD_CUTOFF,
  installApiMocks,
  L1_CUTOFF,
  L1_MODALITY_NAME,
} from './fixtures/api';
import { enterValidScores, openDirectSearch, selectVerifiedL1Course } from './fixtures/flows';

test('resolve Medicina/UFGD 2026 por ID de L1 sem substituir Ampla', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await selectVerifiedL1Course(page);

  const comparison = page.getByRole('region', { name: 'Resumo da comparação' });
  await expect(comparison).toContainText(L1_CUTOFF.toFixed(2).replace('.', ','));
  await expect(comparison).not.toContainText(BROAD_CUTOFF.toFixed(2).replace('.', ','));
  await expect(comparison).toContainText('SISU 2026');
  const trustPanel = page.getByRole('region', { name: 'Origem desta referência' });
  await expect(trustPanel.getByText(L1_MODALITY_NAME, { exact: true })).toBeVisible();
});

test('exibe estado vazio da busca', async ({ page }) => {
  await installApiMocks(page, { emptySearch: true });
  await page.goto('/');
  await openDirectSearch(page);
  await page.getByLabel('Curso, instituição ou cidade').fill('Odontologia');

  await expect(page.getByText('Nenhuma oferta encontrada.', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Resultados da busca' })).toHaveCount(0);
});

test('mantém os destinos do ecossistema XTRI acessíveis sem abrir menus', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Conheça a XTRI' })).toHaveAttribute(
    'href',
    'https://xtri.online',
  );
  await expect(page.getByRole('link', { name: 'Ranking ENEM para escolas' })).toHaveAttribute(
    'href',
    'https://rankingenem.com',
  );
  await expect(page.getByRole('link', { name: 'Instagram @xandaoxtri' })).toHaveAttribute(
    'href',
    'https://instagram.com/xandaoxtri',
  );
});

test('leva do plano direto para uma nova busca com um clique', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await selectVerifiedL1Course(page);

  await page.getByRole('button', { name: 'Curso, universidade ou cidade' }).click();

  await expect(page.getByRole('searchbox', { name: 'Curso, instituição ou cidade' })).toBeFocused();
});

test('recupera a cobertura após resposta 500 e retry', async ({ page }) => {
  const mockState = await installApiMocks(page, { holdCoverageFailure: true });
  await page.goto('/');

  const alert = page.getByRole('alert').filter({ hasText: 'Falha simulada de cobertura.' });
  await expect(alert).toBeVisible();
  mockState.releaseCoverage();
  await alert.getByRole('button', { name: 'Tentar novamente' }).click();

  await expect(alert).toHaveCount(0);
  const coverage = page.getByRole('region', { name: 'Cobertura medida da base' });
  await expect(coverage).toContainText('1 ofertas');
  await expect(coverage).toContainText('1 instituições');
  await expect(coverage).toContainText('1 UFs');
  expect(mockState.coverageAttempts()).toBeGreaterThanOrEqual(2);
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
  await openDirectSearch(page);
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

test('fecha Minhas notas com Escape e devolve o foco', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');

  const openScores = page.getByRole('button', { name: 'Minhas Notas' });
  await openScores.click();
  const dialog = page.getByRole('dialog', { name: 'Minhas notas' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(dialog).toHaveCount(0);
  await expect(openScores).toBeFocused();
});

test('mantém o foco no campo enquanto a nota é digitada', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Minhas Notas' }).click();

  const languages = page.getByLabel('Linguagens', { exact: true });
  await languages.focus();
  await page.keyboard.type('690', { delay: 25 });

  await expect(languages).toBeFocused();
  await expect(languages).toHaveValue('690');
  await expect(page.getByRole('heading', { name: 'Minhas notas' })).not.toBeFocused();
});

test('ativa as abas principais e carrega estatísticas e ofertas próximas inline', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await selectVerifiedL1Course(page);
  await enterValidScores(page);

  const tablist = page.getByRole('tablist', { name: 'Seções da oferta' });
  const yearsTab = tablist.getByRole('tab', { name: 'Plano de pontos' });
  const statisticsTab = tablist.getByRole('tab', { name: 'Estatísticas' });
  const nearbyTab = tablist.getByRole('tab', { name: 'Ofertas próximas' });

  await expect(yearsTab).toHaveAttribute('aria-selected', 'true');
  await yearsTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(statisticsTab).toBeFocused();
  await expect(statisticsTab).toHaveAttribute('aria-selected', 'true');

  const statisticsPanel = page.getByRole('tabpanel', { name: 'Estatísticas' });
  await expect(statisticsPanel).toContainText('Comparativo das notas parciais');
  await expect(statisticsPanel).toContainText('Notas dos aprovados na primeira chamada disponíveis na base');
  await expect(statisticsPanel).toContainText('Notas de corte do SISU');
  await expect(statisticsPanel).toContainText(L1_CUTOFF.toFixed(2).replace('.', ','));
  await expect(statisticsPanel).not.toContainText(BROAD_CUTOFF.toFixed(2).replace('.', ','));

  const radarRequest = page.waitForRequest(request => (
    request.url().endsWith('/api/simulate/radar') && request.method() === 'POST'
  ));
  await page.keyboard.press('End');
  await expect(nearbyTab).toBeFocused();
  await expect(nearbyTab).toHaveAttribute('aria-selected', 'true');
  const request = await radarRequest;
  expect(request.postDataJSON()).toMatchObject({
    courseName: 'Medicina',
    referenceCourseId: 1001,
  });

  const nearbyPanel = page.getByRole('tabpanel', { name: 'Ofertas próximas' });
  await expect(nearbyPanel).toContainText('UFMS');
  await expect(nearbyPanel).toContainText('Campo Grande, MS');
  await expect(nearbyPanel).toContainText('768,00');
  await expect(nearbyPanel).toContainText('+1,86 pts');
  await expect(nearbyPanel).toContainText('225 km');
  await expect(page.getByRole('dialog', { name: /Radar/ })).toHaveCount(0);

  await page.keyboard.press('Home');
  await expect(yearsTab).toBeFocused();
  await expect(yearsTab).toHaveAttribute('aria-selected', 'true');
});

test('compara cortes existentes mesmo sem status verified', async ({ page }) => {
  await installApiMocks(page, { unverifiedReferences: true });
  await page.goto('/');
  await selectVerifiedL1Course(page);
  await enterValidScores(page);

  const requestPromise = page.waitForRequest(request => (
    request.url().endsWith('/api/simulate/radar') && request.method() === 'POST'
  ));
  const tablist = page.getByRole('tablist', { name: 'Seções da oferta' });
  await tablist.getByRole('tab', { name: 'Ofertas próximas' }).click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toMatchObject({ discoveryOnly: false });

  const panel = page.getByRole('tabpanel', { name: 'Ofertas próximas' });
  await expect(panel).toContainText('Disponível na base XTRI');
  await expect(panel).toContainText('UFMS');
  await expect(panel).toContainText('768,00');
  await expect(panel).toContainText('+1,86 pts');
  await expect(panel).toContainText('20 vagas');
  await expect(panel).toContainText('225 km');
  await expect(panel).toContainText('Sua margem nesta oferta');
  await expect(panel).toContainText('ofertas acima da última referência');
  await expect(panel.getByRole('button', { name: 'Revisar minhas notas' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/meu\s*sisu/i);
});

test('discovery mostra cortes da base e oculta somente a margem sem notas', async ({ page }) => {
  await installApiMocks(page, { unverifiedReferences: true });
  await page.goto('/');
  await selectVerifiedL1Course(page);

  const requestPromise = page.waitForRequest(request => (
    request.url().endsWith('/api/simulate/radar') && request.method() === 'POST'
  ));
  const tablist = page.getByRole('tablist', { name: 'Seções da oferta' });
  await tablist.getByRole('tab', { name: 'Ofertas próximas' }).click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toMatchObject({ discoveryOnly: true });

  const panel = page.getByRole('tabpanel', { name: 'Ofertas próximas' });
  await expect(panel).toContainText('Cortes disponíveis na base XTRI');
  await expect(panel).toContainText('Disponível na base XTRI');
  await expect(panel).toContainText('768,00');
  await expect(panel).toContainText('20 vagas');
  await expect(panel).toContainText('225 km');
  await expect(panel).not.toContainText('Sua margem nesta oferta');
  await expect(panel).not.toContainText('ofertas acima da última referência');
});

test('navega pelas abas do detalhe com as setas', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await selectVerifiedL1Course(page);
  await page.getByRole('button', { name: 'Ver informações por ano' }).click();

  const detailTablist = page.getByRole('tablist', { name: 'Detalhes da oferta' });
  const yearsTab = detailTablist.getByRole('tab', { name: 'Informações por ano' });
  const statisticsTab = detailTablist.getByRole('tab', { name: 'Estatísticas' });
  const trustTab = detailTablist.getByRole('tab', { name: 'Confiabilidade' });
  await yearsTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(statisticsTab).toBeFocused();
  await expect(statisticsTab).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(trustTab).toBeFocused();
  await expect(trustTab).toHaveAttribute('aria-selected', 'true');
});
