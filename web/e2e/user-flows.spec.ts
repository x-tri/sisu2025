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
  await expect(comparison).toContainText('SISU 2026');
  const trustPanel = page.getByRole('region', { name: 'Origem desta referência' });
  await expect(trustPanel.getByText(L1_MODALITY_NAME, { exact: true })).toBeVisible();
});

test('mantém somente os filtros de localização após as notas do hero', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');

  await expect(page.locator('#main-course-search')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Top cursos procurados' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Estado' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Cidade' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Instituição' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Curso' })).toBeVisible();
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

test('leva do plano direto para os filtros com um clique', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
  await selectVerifiedL1Course(page);

  await page.getByRole('button', { name: 'Curso, universidade ou cidade' }).click();

  await expect(page.getByRole('combobox', { name: 'Estado' })).toBeFocused();
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

test('mantém o catálogo paginado como fonte dos resultados', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');

  const cards = page.locator('a[href*="courseCode"]');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('#state-filter')).toBeVisible();
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
  await selectVerifiedL1Course(page);

  const openScores = page.getByRole('button', { name: 'Adicionar minhas notas' });
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

  const languages = page.locator('#hero-score-linguagens');
  await languages.focus();
  await page.keyboard.type('690', { delay: 25 });

  await expect(languages).toBeFocused();
  await expect(languages).toHaveValue('690');
});

test('aplica as notas pelo hero e mantém os valores no modal', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');

  await page.locator('#hero-score-linguagens').fill('710');
  await page.locator('#hero-score-humanas').fill('720');
  await page.locator('#hero-score-natureza').fill('730');
  await page.locator('#hero-score-matematica').fill('740');
  await page.locator('#hero-score-redacao').fill('750');
  await page.getByRole('button', { name: 'Aplicar notas', exact: true }).click();

  await expect(page.getByText('Notas salvas. Agora encontre seu curso.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Minhas Notas' })).toHaveCount(0);
  await selectVerifiedL1Course(page);
  await page.getByRole('button', { name: 'Ajustar minhas notas' }).click();
  await expect(page.getByLabel('Linguagens', { exact: true })).toHaveValue('710');
  await expect(page.getByLabel('Redação', { exact: true })).toHaveValue('750');
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

test('publica a política de privacidade e a vincula no rodapé', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/politica-de-privacidade');

  await expect(page.getByRole('heading', { name: 'Política de Privacidade e Cookies' })).toBeVisible();
  await expect(page.getByText('Este site não utiliza cookies.')).toBeVisible();
  await expect(page.getByText('42.535.768/0001-00').first()).toBeVisible();

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = axe.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map(v => v.id)).toEqual([]);

  await page.goto('/');
  const privacy = page.getByRole('link', { name: 'Política de Privacidade e Cookies' });
  await expect(privacy).toBeVisible();
  await privacy.click();
  await expect(page).toHaveURL(/\/politica-de-privacidade$/);
});
