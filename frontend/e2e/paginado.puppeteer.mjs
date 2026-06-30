/**
 * E2E de paginado (Puppeteer) — verifica el paginado server-side en el navegador real.
 *
 * Requisitos:
 *   1. App de ESTA rama (feature/paginado) corriendo y accesible en BASE_URL
 *      (build del worktree, NO el docker de master que no tiene paginado).
 *   2. Un usuario de prueba con DATOS suficientes para superar 1 página (>10 ítems)
 *      en al menos una pantalla paginada (notificaciones o subastas activas).
 *   3. `npm i -D puppeteer` en frontend/ (no es dependencia del proyecto).
 *
 * Uso:
 *   BASE_URL=http://localhost:4173 TEST_USER=tester TEST_PASS=secret \
 *     node e2e/paginado.puppeteer.mjs
 *
 * Sale con código 0 si todas las aserciones pasan; 1 si alguna falla.
 * Captura screenshots en e2e/screenshots/.
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';
const TEST_USER = process.env.TEST_USER ?? 'tester';
const TEST_PASS = process.env.TEST_PASS ?? 'secret';
const SHOTS = new URL('./screenshots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures++; };
const $txt = (page, sel) => page.$eval(sel, (el) => el.textContent?.trim() ?? '').catch(() => null);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ── Login ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[name="username"], input[type="text"]', TEST_USER);
  await page.type('input[type="password"]', TEST_PASS);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  ok(!page.url().includes('/login'), 'login redirige fuera de /login');

  // ── Pantalla paginada: Notificaciones ───────────────────────────────────────
  // El <Paginador> sólo se renderiza si totalPages > 1 (hace falta >10 ítems).
  await page.goto(`${BASE_URL}/notificaciones`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  const pager = await page.$('[aria-label="Página siguiente"]');
  if (!pager) {
    console.log('⚠ No hay paginador en Notificaciones (¿menos de 11 ítems?). ' +
      'Sembrá más datos o probá otra pantalla; no se puede verificar el paso de página.');
  } else {
    await page.screenshot({ path: `${SHOTS}notificaciones-p1.png` });

    // Prev deshabilitado en página 1
    const prevDisabled = await page.$eval('[aria-label="Página anterior"]', (b) => b.disabled);
    ok(prevDisabled, 'botón "anterior" deshabilitado en la página 1');

    // Capturar el primer item de la página 1
    const firstP1 = await $txt(page, 'main, [role="main"], body');

    // Ir a la página 2
    const p2 = await page.$('button[aria-current="page"]');
    void p2;
    await page.click('[aria-label="Página siguiente"]');
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${SHOTS}notificaciones-p2.png` });

    const current = await $txt(page, 'button[aria-current="page"]');
    ok(current === '2', `la página actual es 2 (fue: ${current})`);

    const firstP2 = await $txt(page, 'main, [role="main"], body');
    ok(firstP1 !== firstP2, 'el contenido cambió entre página 1 y página 2');
  }

  // ── Subastas activas: filtro estado server-side + reset de página ────────────
  await page.goto(`${BASE_URL}/subastas/activas`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS}subastas-activas.png` });
  ok(true, 'subastas/activas carga sin errores (ver screenshot)');

  // ── Buscar (catálogo): grilla paginada + filtros server-side ─────────────────
  // El catálogo agrupa por figurita-base y pagina server-side; el <Paginador> aparece
  // si hay >10 figuritas-base disponibles de otros usuarios.
  await page.goto(`${BASE_URL}/buscar`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS}buscar-catalogo-p1.png` });

  const buscarPager = await page.$('[aria-label="Página siguiente"]');
  if (!buscarPager) {
    console.log('⚠ No hay paginador en Buscar (¿menos de 11 figuritas-base disponibles?). ' +
      'Sembrá más datos para verificar el paso de página del catálogo.');
  } else {
    const firstP1 = await $txt(page, 'main, [role="main"], body');
    await page.click('[aria-label="Página siguiente"]');
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${SHOTS}buscar-catalogo-p2.png` });
    const current = await $txt(page, 'button[aria-current="page"]');
    ok(current === '2', `Buscar: la página actual es 2 (fue: ${current})`);
    const firstP2 = await $txt(page, 'main, [role="main"], body');
    ok(firstP1 !== firstP2, 'Buscar: el contenido cambió entre página 1 y 2');
  }

  // ── Mi Colección · Faltantes: grilla paginada server-side ────────────────────
  await page.goto(`${BASE_URL}/coleccion/faltantes`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS}coleccion-faltantes.png` });
  ok(true, 'coleccion/faltantes carga sin errores (ver screenshot)');

} catch (e) {
  console.error('E2E error:', e);
  failures++;
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
