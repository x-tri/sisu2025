import { expect, type Page } from '@playwright/test';
import { L1_MODALITY_ID, L1_MODALITY_NAME } from './api';

export async function selectVerifiedL1Course(page: Page): Promise<void> {
  await page.getByLabel('Curso, instituição ou cidade').fill('Medicina');
  const results = page.getByRole('list', { name: 'Resultados da busca' });
  await expect(results).toBeVisible();
  await results.getByRole('button', { name: /Medicina.*UFGD.*Dourados.*MS/ }).click();

  const modality = page.getByRole('combobox', { name: /Modalidade oficial/ });
  await expect(modality).toBeVisible();
  await modality.selectOption(L1_MODALITY_ID);
  await expect(page.getByRole('heading', { name: 'Resumo da comparação' })).toBeVisible();
  await expect(modality.locator('option:checked')).toHaveText(L1_MODALITY_NAME);
}

export async function enterValidScores(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Redação', { exact: true }).fill('770');
  await page.getByLabel('Linguagens', { exact: true }).fill('770');
  await page.getByLabel('Matemática', { exact: true }).fill('770');
  await page.getByLabel('Ciências Humanas', { exact: true }).fill('770');
  await page.getByLabel('Ciências da Natureza', { exact: true }).fill('770');
  await page.getByRole('button', { name: 'Usar estas notas' }).click();
}
