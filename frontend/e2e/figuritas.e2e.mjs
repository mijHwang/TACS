// E2E: verifica que el catálogo real + fotos + wiring del front funcionan en el browser.
// Precondición: app levantada y seed-demo ejecutado (existe juanca/demo1234).
// Uso: BASE_URL=http://localhost npm run e2e
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost';
const USER = process.env.E2E_USER ?? 'juanca';
const PASS = process.env.E2E_PASS ?? 'demo1234';
const TIMEOUT = 30_000;

// PNG transparente 1x1 para stubbear las imágenes (no depender del CDN ni del onError).
const STUB_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() === 'image') {
      req.respond({ status: 200, contentType: 'image/png', body: STUB_PNG });
    } else {
      req.continue();
    }
  });

  // 1) Login como juanca
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await page.waitForSelector('#login-username', { timeout: TIMEOUT });
  await page.type('#login-username', USER);
  await page.type('#login-password', PASS);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !!localStorage.getItem('token'), { timeout: TIMEOUT });

  // 2) Mi Colección (Todas): hay figuritas reales y aparece "Argentina"
  await page.goto(`${BASE_URL}/coleccion`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await page.waitForSelector('[data-testid="figurita-card"]', { timeout: TIMEOUT });
  const cardsTodas = await page.$$eval('[data-testid="figurita-card"]', (els) => els.length);
  assert.ok(cardsTodas >= 1, `Todas: esperaba >=1 figurita, hubo ${cardsTodas}`);
  const bodyText = await page.$eval('body', (el) => el.textContent ?? '');
  assert.ok(bodyText.includes('Argentina'), 'Todas: esperaba ver "Argentina" en la colección');

  // 3) Faltantes: catálogo grande cargado + figuritas con foto real (img src http)
  await page.goto(`${BASE_URL}/coleccion/faltantes`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await page.waitForSelector('[data-testid="figurita-card"]', { timeout: TIMEOUT });
  const cardsFaltantes = await page.$$eval('[data-testid="figurita-card"]', (els) => els.length);
  assert.ok(cardsFaltantes >= 50, `Faltantes: esperaba catálogo grande (>=50), hubo ${cardsFaltantes}`);
  const conFoto = await page.$$eval(
    '[data-testid="figurita-card"] img',
    (imgs) => imgs.filter((i) => (i.getAttribute('src') ?? '').startsWith('http')).length,
  );
  assert.ok(conFoto >= 1, 'Faltantes: esperaba >=1 figurita con foto real (img src http)');

  console.log(`OK — Todas: ${cardsTodas} figuritas, Faltantes: ${cardsFaltantes} (con foto: ${conFoto})`);
} finally {
  await browser.close();
}
