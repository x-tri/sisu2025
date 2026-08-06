import { expect, type Page } from '@playwright/test';
import { L1_MODALITY_ID, L1_MODALITY_NAME } from './api';

export async function selectVerifiedL1Course(page: Page): Promise<void> {
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('MS');
  await page.getByRole('combobox', { name: 'Cidade' }).selectOption('Dourados');
  await page.getByRole('combobox', { name: 'Instituição' }).selectOption('UFGD');
  const course = page.getByRole('combobox', { name: 'Curso' });
  await expect(course).toBeEnabled();
  await expect(course.locator('option')).toContainText(['Curso', 'Medicina']);
  await course.selectOption('1001');

  const modality = page.getByRole('combobox', { name: /Modalidade oficial/ });
  await expect(modality).toBeVisible();
  await modality.selectOption(L1_MODALITY_ID);
  await expect(page.getByRole('region', { name: 'Resumo da comparação' })).toBeVisible();
  await expect(modality.locator('option:checked')).toHaveText(L1_MODALITY_NAME);
}

export async function openDirectSearch(page: Page): Promise<void> {
  await expect(page.getByLabel('Curso, instituição ou cidade')).toBeVisible();
}

export async function enterValidScores(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Minhas Notas', exact: true }).click();
  await page.getByLabel('Redação', { exact: true }).fill('770');
  await page.getByLabel('Linguagens', { exact: true }).fill('770');
  await page.getByLabel('Matemática', { exact: true }).fill('770');
  await page.getByLabel('Ciências Humanas', { exact: true }).fill('770');
  await page.getByLabel('Ciências da Natureza', { exact: true }).fill('770');
  await page.getByRole('button', { name: 'Salvar' }).click();
}
