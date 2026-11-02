import { expect, type Page, test } from '@playwright/test';

/**
 * Recorrido completo de un dueño de negocio nuevo, de principio a fin, contra la app real.
 * Crea su propio usuario y lo elimina al final (no deja datos de prueba en la base).
 */
const email = `e2e-${Date.now()}@pulsolocal.test`;
const password = 'Galeras2026Prueba';
const businessName = `Panadería E2E ${Date.now()}`;

const REVIEWS = [
  'El pan de yuca delicioso y siempre caliente',
  'Se demoraron mucho en atender, había una sola persona',
  'Buen precio y atención muy amable',
  'El café estaba frío y el local sucio',
].join('\n');

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Mis negocios' })).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('registro: guía de contraseña y acceso al panel', async ({ page }) => {
  await page.goto('/registro');
  await page.getByLabel('Nombre').fill('Prueba E2E');
  await page.getByLabel('Correo').fill(email);
  const requirements = page.getByRole('list', { name: 'Requisitos de la contraseña' });

  await page.getByLabel('Contraseña', { exact: true }).fill('corta1');
  await expect(requirements.getByText('Al menos 10 caracteres')).toContainText('(pendiente)');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await expect(requirements.getByText('Al menos 10 caracteres')).toContainText('(cumplido)');

  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Mis negocios' })).toBeVisible();
  await expect(page).toHaveTitle('Mis negocios · PulsoLocal');
});

test('credenciales erradas muestran un error genérico', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('no-es-la-clave-1');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('Credenciales inválidas');
});

test('crear negocio, importar, analizar con IA, exportar y eliminar', async ({ page }) => {
  await login(page);

  // Crear el negocio
  await page.getByLabel('Nombre').fill(businessName);
  await page.getByLabel('Categoría').selectOption('tienda');
  await page.getByRole('button', { name: 'Crear negocio' }).click();
  await page.getByRole('link', { name: new RegExp(businessName) }).click();
  await expect(page.getByRole('heading', { name: businessName, level: 1 })).toBeVisible();

  // Importar reseñas pegadas
  await page.getByRole('tab', { name: 'Pegar texto' }).click();
  await page.getByRole('textbox').last().fill(REVIEWS);
  await page.getByRole('button', { name: 'Importar reseñas' }).click();
  await expect(page.getByText('4 reseñas importadas.')).toBeVisible();

  // Analizar (con el motor configurado en el backend: Gemini o el léxico local)
  await page.getByRole('button', { name: 'Analizar con IA' }).click();
  await expect(page.getByText('Análisis completado')).toBeVisible({ timeout: 110_000 });
  await expect(page.getByRole('heading', { name: 'Recomendaciones para tu negocio' })).toBeVisible();
  await expect(page.getByText('Reseñas analizadas')).toBeVisible();

  // Exportar CSV
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/^resenas-panaderia-e2e-.*\.csv$/);

  // Eliminar el negocio: exige escribir su nombre exacto
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('button', { name: 'Eliminar negocio' }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Eliminar negocio' });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox').fill(businessName);
  await confirm.click();
  await expect(page.getByText(`«${businessName}» fue eliminado.`)).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(businessName) })).toHaveCount(0);
});

test('eliminar la cuenta borra el acceso', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Mi cuenta' }).click();
  await expect(page).toHaveTitle('Mi cuenta · PulsoLocal');

  const danger = page.locator('section', { hasText: 'Eliminar cuenta' });
  await danger.getByLabel('Contraseña', { exact: true }).fill(password);
  await danger.getByRole('button', { name: 'Eliminar mi cuenta' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('ELIMINAR');
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar mi cuenta' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('Credenciales inválidas');
});

test('una ruta inexistente muestra la página 404', async ({ page }) => {
  await page.goto('/esta/ruta/no-existe');
  await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible();
});
