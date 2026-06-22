# Spec — Mi Colección (Mis repetidas + Mis faltantes)

- **Fecha:** 2026-06-22
- **Estado:** Aprobado (diseño) — pendiente de plan de implementación
- **User Stories relacionadas:** US2 (registrar faltantes), parte de US8 (ver mi colección). "Mis repetidas" es la base para US4/US6 (sugerencias y subastas), pero acá solo se visualiza.
- **Alcance:** Frontend únicamente. El backend **no se modifica**.

## 1. Contexto y problema

El menú lateral tiene hoy una entrada **"Colección"** (`/coleccion`) cuya página mezcla dos responsabilidades: actúa como layout (título + tabs + `<Outlet/>`) y además renderiza embebida la vista "Todas" condicionada por `useMatch('/coleccion')`. Las tabs actuales son **"Todas"** y **"Faltantes"**.

El árbol deseado es:

```
Mi Colección
├── Mis repetidas
└── Mis faltantes
```

Faltantes:
- **"Mis repetidas"** no existe como página/tab. El endpoint backend ya está hecho (`GET /api/usuarios/{userName}/figuritas/repetidas`) pero solo lo consume `subastas/NuevaPage`.
- **"Mis faltantes"** ya está implementado como `FaltantesPage` (tab "Faltantes"); solo necesita renombre de etiqueta y verificación.
- Los nombres del menú/tabs no coinciden con el árbol deseado ("Colección" vs "Mi Colección", "Faltantes" vs "Mis faltantes").

Además, `ColeccionPage` (vista "Todas") y `FaltantesPage` son **casi idénticas**: repiten el bloque de filtros (búsqueda + selección/equipo/categoría) y la grilla de tarjetas. Agregar "Mis repetidas" generaría un **tercer** clon de ese patrón.

## 2. Objetivos / No-objetivos

**Objetivos**
1. Agregar la página **"Mis repetidas"** dentro de "Mi Colección" (solo lectura).
2. Mantener/renombrar **"Mis faltantes"** y verificar que funciona.
3. Renombrar **"Colección" → "Mi Colección"** y exponer las tres tabs: Todas · Mis repetidas · Mis faltantes.
4. **Eliminar la duplicación** de filtros+grilla extrayendo componentes reutilizables.

**No-objetivos (fuera de alcance)**
- Tocar el backend (los 3 endpoints ya existen y `/repetidas` ya devuelve `count`).
- Agregar acciones de intercambio/subasta desde estas páginas (las tarjetas de "Mis repetidas" son solo lectura).
- Montar infraestructura de tests del frontend (Vitest/Jest). Verificación por `npm run build` + `npm run lint` + smoke manual.
- Cambiar las URLs existentes (`/coleccion`, `/coleccion/faltantes`).
- Sugerencias de Intercambio (es el Spec 2, separado).

## 3. Decisiones (cerradas en brainstorming)

| Tema | Decisión |
|---|---|
| Navegación | Mantener "Todas" como landing + agregar tabs "Mis repetidas" y "Mis faltantes" (3 tabs). |
| Conteo en "Mis repetidas" | Mostrar **total y excedente** juntos: `x{count} ({count-1} repetidas)`. |
| Click en tarjeta de repetidas | **Solo lectura** (sin acción). |
| Enfoque de código | **Extraer componentes reutilizables** compartidos por las 3 vistas. |
| Testing | `npm run build` + `npm run lint` + smoke manual (sin Vitest). |

## 4. Diseño detallado

### 4.1 Routing y estructura

`ColeccionPage` pasa a ser **layout puro** (título "Mi Colección" + tabs + `<Outlet/>`). La vista "Todas", hoy embebida, se extrae a su propio componente de ruta `TodasPage` (ruta índice).

```
/coleccion              → ColeccionPage (layout: título + tabs + <Outlet/>)
   index                → TodasPage         (toda la colección; badge x{count})
   /coleccion/repetidas → RepetidasPage     (solo count>1; "x{count} ({count-1} repetidas)")
   /coleccion/faltantes → FaltantesPage     (faltantes; #numero; click → /buscar)
```

Tabs (en `ColeccionPage`), usando `NavLink` con `end` en el índice para que "Todas" no quede activo en las subrutas:

- **Todas** → `to=""` (index, con `end`)
- **Mis repetidas** → `to="repetidas"`
- **Mis faltantes** → `to="faltantes"`

Cambios en `src/router/router.tsx`: agregar `const RepetidasPage = lazy(...)` y `const TodasPage = lazy(...)`; dentro de la ruta `coleccion`, definir `{ index: true, element: <TodasPage/> }`, `{ path: 'repetidas', element: <RepetidasPage/> }` y mantener `{ path: 'faltantes', element: <FaltantesPage/> }`.

### 4.2 Componentes reutilizables

Ubicación: `src/pages/coleccion/components/`.

**a) `useFiltrosFigurita()` — hook**

Mantiene el estado de los 4 controles y expone un filtro reutilizable.

```ts
// Cualquier item con estos campos es filtrable (lo cumplen FiguritaResponseDTO y FiguritaBaseDTO)
interface FiguritaFiltrable {
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
}

function useFiltrosFigurita(): {
  // valores
  searchTerm: string; filterSeleccion: string; filterEquipo: string; filterCategoria: string;
  // setters
  setSearchTerm: (v: string) => void; setFilterSeleccion: (v: string) => void;
  setFilterEquipo: (v: string) => void; setFilterCategoria: (v: string) => void;
  // aplicación del predicado
  filtrar: <T extends FiguritaFiltrable>(items: T[]) => T[];
}
```

El predicado replica el actual: `searchTerm` matchea contra `jugadorNombre`; cada filtro matchea (substring, case-insensitive) contra su campo; campo vacío = no filtra. Se usa guarda defensiva `(campo || '')` como ya hace `ColeccionPage`.

**b) `<FiltrosFigurita>` — presentacional**

Recibe valores + setters (los del hook) y dibuja el input de búsqueda (ancho completo) + grilla de 3 inputs (selección/equipo/categoría). Es exactamente el bloque hoy duplicado en `ColeccionPage` y `FaltantesPage`. Misma estética Tailwind que ya existe.

**c) `<TarjetaColeccion>` — presentacional**

Tarjeta unificada (placeholder de imagen + selección/jugador/equipo/categoría) con un **slot `footer`** y `onClick` opcional.

```tsx
interface TarjetaColeccionProps {
  seleccionNombre: string;
  jugadorNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  footer?: React.ReactNode;     // badge (Todas/Repetidas) o "#numero" (Faltantes)
  onClick?: () => void;          // si está presente: cursor-pointer + hover
}
```

> **Naming:** se llama `TarjetaColeccion` (no `FiguritaCard`) para no colisionar con los existentes `src/components/Figurita.tsx` y `src/pages/home/components/FiguritaCard.tsx`, que son del dashboard mock (con foto) y **no se tocan**.

**d) `<GrillaFiguritas>` (opcional, recomendado) — presentacional**

Wrapper de la grilla (`grid grid-cols-4 gap-4`) + manejo del estado vacío (mensaje configurable). Recibe `children` y un `emptyMessage`/`isEmpty`. Reduce repetición del contenedor y del "No tienes figuritas / ¡Tienes todas!". Si se considera demasiado fino, puede quedar inline; queda a criterio del plan.

### 4.3 Páginas (consumidores)

Cada página: hace su fetch, usa `useFiltrosFigurita`, renderiza `<FiltrosFigurita {...}/>` y mapea `filtrar(items)` a `<TarjetaColeccion/>`.

| Página | Endpoint | Tipo | Footer de tarjeta | onClick |
|---|---|---|---|---|
| `TodasPage` | `GET /api/usuarios/{username}/figuritas` | `FiguritaResponseDTO[]` | badge `x{count}` | — |
| `RepetidasPage` | `GET /api/usuarios/{username}/figuritas/repetidas` | `FiguritaResponseDTO[]` | `x{count} ({count-1} repetidas)` | — |
| `FaltantesPage` | `GET /api/usuarios/{username}/figuritas/faltantes` | `FiguritaBaseDTO[]` | `#{numero}` | `navigate('/buscar', { state: { filterByBaseId, figuritaInfo } })` |

Notas:
- `key` de cada tarjeta: usar `figuritaBaseId` (Todas/Repetidas) o `id` (Faltantes), como hoy.
- Estados de carga (`loading`) y vacío se mantienen por página (mensajes propios: "No tienes figuritas aún", "¡Tienes todas las figuritas!", y para repetidas: "No tenés figuritas repetidas").
- El cálculo `count - 1` vive en `RepetidasPage` (footer). El endpoint `/repetidas` solo devuelve grupos con `count > 1`, así que el excedente siempre es ≥ 1.

### 4.4 Renombres

- `src/layouts/MainLayout.tsx` → `navLinks`: label **"Colección" → "Mi Colección"** (el `to: '/coleccion'` y el icono no cambian).
- `src/pages/coleccion/ColeccionPage.tsx` → título **"Mi Colección"**; subtítulo puede quedar "Administrá tus figuritas".
- Labels de tabs: **"Todas"**, **"Mis repetidas"**, **"Mis faltantes"**.

## 5. Lista de cambios por archivo

**Nuevos**
- `src/pages/coleccion/components/useFiltrosFigurita.ts`
- `src/pages/coleccion/components/FiltrosFigurita.tsx`
- `src/pages/coleccion/components/TarjetaColeccion.tsx`
- `src/pages/coleccion/components/GrillaFiguritas.tsx` (opcional)
- `src/pages/coleccion/TodasPage.tsx` (extraído de la vista índice actual)
- `src/pages/coleccion/RepetidasPage.tsx`

**Modificados**
- `src/pages/coleccion/ColeccionPage.tsx` → layout puro (título + tabs + `<Outlet/>`); se le saca la vista embebida y el `useMatch`.
- `src/pages/coleccion/FaltantesPage.tsx` → refactor para usar los componentes compartidos (comportamiento idéntico).
- `src/router/router.tsx` → nuevas rutas `index` (TodasPage) y `repetidas` (RepetidasPage).
- `src/layouts/MainLayout.tsx` → label "Mi Colección".

**Sin cambios**
- Todo el backend.
- `src/components/Figurita.tsx`, `src/pages/home/components/FiguritaCard.tsx` (dashboard mock).

## 6. Testing / verificación

No hay runner de tests en el frontend; no se introduce uno en este spec.

- `cd frontend && npm run build` (compila TS + build de Vite, valida tipos).
- `cd frontend && npm run lint` (ESLint).
- **Smoke manual** (con la app levantada vía `docker compose up --build` y un usuario con figuritas):
  1. El sidebar muestra "Mi Colección".
  2. `/coleccion` muestra las 3 tabs y la vista "Todas" con badges `x{count}`.
  3. "Mis repetidas" lista solo figuritas con `count > 1` y muestra `x{count} ({count-1} repetidas)`.
  4. "Mis faltantes" funciona igual que antes (lista + click → `/buscar`).
  5. Los filtros (búsqueda + selección/equipo/categoría) funcionan en las 3 tabs.

## 7. Riesgos

- **Bajo.** Cambios acotados al frontend. El refactor toca `FaltantesPage` y la vista "Todas" (hoy funcionando): el riesgo se mitiga manteniendo comportamiento idéntico y verificando con build+lint+smoke.
- Posible confusión de nombres de componentes: mitigado con el naming `TarjetaColeccion`.

## 8. Cuestiones abiertas

Ninguna.
