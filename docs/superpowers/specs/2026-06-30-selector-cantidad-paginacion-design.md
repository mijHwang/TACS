# Selector de cantidad por página + Paginador siempre visible

**Fecha:** 2026-06-30
**Ámbito:** Frontend (React + Vite + react-query)

## Contexto

Hoy todas las páginas paginadas del frontend usan un tamaño de página fijo
(`DEFAULT_PAGE_SIZE = 10`, definido en `src/services/api.ts` y duplicado en
`src/services/auctionService.ts`). El usuario no puede elegir cuántos resultados
ver por página, y el componente `Paginador` se auto-oculta cuando hay una sola
página (`if (totalPages <= 1) return null;`), por lo que en listas cortas no se
ve ningún control de paginación.

## Objetivo

Permitir que el usuario elija cuántos resultados mostrar por página, de forma
consistente y prolija en todas las páginas de navegación server-side, y que la
fila de números del `Paginador` esté **siempre** visible.

## Decisiones tomadas

- **Ubicación del selector:** arriba a la derecha de cada lista, junto a un
  contador de resultados (opción B). Se materializa con un wrapper compartido
  (`ListToolbar`) para que quede idéntico en todas las páginas.
- **Opciones de cantidad:** `10 / 20 / 50 / 100`. Default `10` (preserva el
  comportamiento actual).
- **Persistencia:** preferencia **global** en `localStorage` (una sola para toda
  la app). Si elijo `20` en Colección, Buscar/Subastas/etc. arrancan en `20`.
- **Paginador siempre visible:** se elimina el auto-ocultado; con 1 página se
  muestra el número `1` (con ‹ › deshabilitados).
- **Caso 0 resultados:** se muestra igual el `1` debajo del mensaje de lista
  vacía (comportamiento literal "siempre visible").
- **Contador:** se muestra `{totalElements} resultados` a la izquierda del
  selector (el dato ya viene en `PagedResponse`, es gratis).

## Alcance

### Páginas con selector (13, server-side)

1. Buscar — `src/pages/buscar/BuscarPage.tsx`
2. Colección / Todas — `src/pages/coleccion/TodasPage.tsx`
3. Colección / Repetidas — `src/pages/coleccion/RepetidasPage.tsx`
4. Colección / Faltantes — `src/pages/coleccion/FaltantesPage.tsx`
5. Subastas / Activas — `src/pages/subastas/ActivasPage.tsx`
6. Subastas / Mías — `src/pages/subastas/MiasPage.tsx`
7. Subastas / Participando — `src/pages/subastas/ParticipandoPage.tsx`
8. Propuestas / Recibidas — `src/pages/propuestas/RecibidasPage.tsx`
9. Propuestas / Enviadas — `src/pages/propuestas/EnviadasPage.tsx`
10. Intercambios — `src/pages/intercambios/IntercambiosPage.tsx`
11. Notificaciones — `src/pages/notificaciones/NotificacionesPage.tsx`
12. Sugerencias — `src/pages/sugerencias/SugerenciasPage.tsx`
13. Admin / Regalar figurita — `src/pages/admin/AdminGiftPage.tsx`

### Fuera del selector (pero alcanzadas por el cambio del Paginador)

- **Propuestas / Nueva** (`NuevaPage.tsx`): no es un browse server-side, es un
  picker que carga la colección completa (`size: 2000`) y la corta en memoria.
  No lleva selector. Usa `Paginador`, así que recibe el cambio de "números
  siempre visibles".
- **Perfil / Historial** (`HistorialPage.tsx`): datos mock con paginación propia
  (botones a mano, no usa `Paginador`). No lleva selector ni se toca.

## Arquitectura

Tres piezas compartidas nuevas + un cambio puntual al `Paginador`.

### 1. `usePageSize()` — hook (`src/hooks/usePageSize.ts`)

Fuente única de la preferencia global.

- Estado seedeado desde `localStorage` (clave `tacs.pageSize`), con write-through
  en cada cambio.
- Valida el valor guardado contra `PAGE_SIZE_OPTIONS`; si es inválido o no existe,
  cae a `DEFAULT_PAGE_SIZE` (`10`).
- Como las rutas montan de a una, no se necesita store externo ni sync cross-tab:
  al navegar a otra página, monta y lee el valor más reciente de `localStorage`.

```ts
function usePageSize(): {
  pageSize: number;
  setPageSize: (n: number) => void;
  options: number[];   // [10, 20, 50, 100]
}
```

### 2. `PageSizeSelector` — componente (`src/components/PageSizeSelector.tsx`)

`<select>` presentacional puro, estilado con la convención TACS (borde
`#03BAE9`, `rounded-lg`, altura ~32px). Label "Mostrar".

```ts
interface PageSizeSelectorProps {
  value: number;
  options: number[];
  onChange: (n: number) => void;
}
```

No conoce `localStorage` ni el estado de página: solo emite el nuevo valor. El
page decide qué hacer (setear la preferencia + resetear a página 0).

### 3. `ListToolbar` — wrapper de ubicación (`src/components/ListToolbar.tsx`)

Fila `flex items-center justify-between` que se ubica **arriba de la grilla/lista**.
Materializa la opción B de forma idéntica en las 13 páginas.

```ts
interface ListToolbarProps {
  total?: number;       // totalElements → "{n} resultados" a la izquierda
  children: ReactNode;  // el PageSizeSelector a la derecha
}
```

- Izquierda: `{total} resultados` (si `total` es `undefined`, no renderiza el
  contador).
- Derecha: `children`.

### 4. `Paginador` — cambio (`src/components/Paginador.tsx`)

- Se elimina `if (totalPages <= 1) return null;`.
- Se clampa: `const total = Math.max(1, totalPages);` y la ventana de números se
  calcula sobre `total`. Con `total === 1` muestra solo el `1`, con ‹ y ›
  deshabilitados.
- Es el componente compartido: el cambio cubre las 14 páginas que lo usan de una
  sola vez.

## Cableado por página

Hay dos estilos según cómo obtiene el `size` cada grupo de páginas.

### Estilo A — centralizado en `useFiltrosServidor` (Colección: 3 páginas)

`useFiltrosServidor` (`src/pages/coleccion/components/useFiltrosServidor.ts`)
integra `usePageSize()`, inyecta `size` en `params` y envuelve `setPageSize`
para resetear a página 0 al cambiar el tamaño. Expone además
`pageSize / setPageSize / options` para que el page renderice el selector.

```ts
// useFiltrosServidor devuelve, además de lo actual:
//   pageSize, setPageSize, options
// y params incluye: size: pageSize
```

Las páginas de Colección solo agregan el `ListToolbar` + `PageSizeSelector`
leyendo del hook. El `queryKey` de los hooks paginados ya depende del objeto
`params` completo, así que incluir `size` ahí dispara el refetch automáticamente.

### Estilo B — directo en el page / hook (las otras 10 páginas)

El page llama `usePageSize()` y pasa `size: pageSize` al fetch, **incluyendo
`pageSize` en el `queryKey`** de react-query para que el cambio refetchee.

```tsx
const { pageSize, setPageSize, options } = usePageSize();
// ...fetch con size: pageSize, queryKey [..., page, pageSize]...

<ListToolbar total={data?.totalElements}>
  <PageSizeSelector
    value={pageSize}
    options={options}
    onChange={(n) => { setPageSize(n); setPage(0); }}
  />
</ListToolbar>
{/* grilla / lista */}
<Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
```

Los hooks que hoy **hornean** `DEFAULT_PAGE_SIZE` en el `queryFn`
(`useSubastas` y variantes) deben recibir `size` por parámetro e incluirlo en su
`queryKey`. Los hooks que ya reciben `size`
(`usePropuestasRecibidas/Enviadas`, `useNotificaciones`, `useSugerencias`) solo
necesitan que el page les pase `pageSize` y que el `size` esté en el `queryKey`.

## Limpieza incluida

- `DEFAULT_PAGE_SIZE` y un nuevo `PAGE_SIZE_OPTIONS = [10, 20, 50, 100]` viven
  **solo** en `src/services/api.ts`.
- Se elimina el `DEFAULT_PAGE_SIZE = 10` duplicado de
  `src/services/auctionService.ts`; los métodos del service reciben el `size`
  desde el page (ya lo aceptan como parámetro).

## Testing

- **`usePageSize`** (nuevo): default `10` sin `localStorage`; persiste y relee;
  ignora valores inválidos cayendo al default.
- **`PageSizeSelector`** (nuevo): renderiza las 4 opciones; `onChange` emite el
  número elegido.
- **`ListToolbar`** (nuevo): muestra `{n} resultados` cuando hay `total`; lo
  omite cuando no.
- **`Paginador`** (actualizar `Paginador.test.tsx`): el test que hoy espera
  `null` con `totalPages <= 1` cambia — ahora debe renderizar el `1`.
- **Por página (al menos 1-2 representativas):** cambiar el selector dispara un
  refetch con el nuevo `size` y resetea a página 0.
- Los tests existentes que asertan `size: 10` / `DEFAULT_PAGE_SIZE` siguen
  pasando porque el default no cambia.

## Archivos tocados

**Nuevos:** `src/hooks/usePageSize.ts`, `src/components/PageSizeSelector.tsx`,
`src/components/ListToolbar.tsx` (+ sus tests).

**Modificados:** `src/services/api.ts` (`PAGE_SIZE_OPTIONS`),
`src/services/auctionService.ts` (dedup), `src/components/Paginador.tsx`,
`src/pages/coleccion/components/useFiltrosServidor.ts`, los hooks que hornean
`size` (`useSubastas.ts`) y las 13 páginas del alcance.
