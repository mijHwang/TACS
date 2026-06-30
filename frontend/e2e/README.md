# E2E de paginado (Puppeteer)

`paginado.puppeteer.mjs` verifica en un navegador real que el paginado server-side funciona:
login → pantalla paginada → el `<Paginador>` aparece (cuando hay >1 página), "anterior"
deshabilitado en la página 1, el contenido cambia al pasar de página, y `subastas/activas`
carga con el filtro de estado server-side.

## Cómo correrlo

```bash
cd frontend
npm i -D puppeteer            # no es dependencia del proyecto
# Levantar la app de ESTA rama (no el docker de master, que no tiene paginado), p.ej:
#   npm run build && npm run preview      # sirve el front en :4173
#   (con el backend de esta rama corriendo y VITE_API_URL apuntándole)
BASE_URL=http://localhost:4173 TEST_USER=<user> TEST_PASS=<pass> \
  node e2e/paginado.puppeteer.mjs
```

Necesita un usuario de prueba con **más de 10 ítems** en alguna pantalla paginada
(notificaciones o subastas) para que el paginador tenga >1 página; si no, el script avisa
y no puede verificar el paso de página. Las capturas quedan en `e2e/screenshots/`.

## Nota sobre la verificación de esta entrega

El grueso de la verificación está en los tests automáticos que **ya corren en verde**:

- **Backend (36 tests):** los service tests de cada slice mockean el repositorio devolviendo
  un `PageImpl`, y verifican el mapeo del contenido, los totales (`totalElements/totalPages/last`)
  y que el `Pageable` (página 0, size 10) se reenvía. Incluye el reenvío del filtro `estado` en
  subastas y el fix del doble `findByUsuarioId` en intercambios.
- **Frontend (69 tests, Vitest):** `Paginador` (etiquetas 1-based, current, prev/next, ventana,
  clamp), y tests de hooks/páginas que afirman que se manda `?page=&size=` y que cambiar de
  página vuelve a pedir los datos.

Este E2E es la capa de confirmación en navegador real; se entrega como artefacto para correr
en un entorno controlado (con datos sembrados), porque el entorno local actual está ocupado por
otra sesión y comparte la base Atlas.
