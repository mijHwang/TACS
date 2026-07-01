# Diseño: Catálogo real de figuritas (Mundial FIFA 2026)

**Fecha:** 2026-06-30
**Estado:** Aprobado para planificar
**Autor:** Sichermatias (con Claude)

## Problema

La base se puebla hoy con un catálogo de **demo hardcodeado en Java** (`DemoSeedService`):
48 `FiguritaBase` falsas = 16 jugadores × 3 categorías, solo 2 selecciones
(Argentina/Brasil). Cargar/armar figuritas reales a mano es inviable. Queremos que la
base tenga, **desde el arranque**, un catálogo de figuritas **reales** del Mundial 2026,
**con fotos reales de los jugadores**.

## Objetivo

Pre-poblar la base con un catálogo realista del **Mundial FIFA 2026**:
- **48 selecciones**, **~18 jugadores por selección** ≈ **~850 `FiguritaBase`**.
- Cargado **automáticamente e idempotente al arrancar** desde un **JSON commiteado**.
- Cada figurita con **foto real del jugador** (`imagenUrl`) resuelta **offline una sola vez**
  desde una API pública y embebida en el JSON; **fallback a diseño generado** cuando no haya foto.
- El seeder de demo (`seed-demo`) se **adapta** para armar su escenario de trading
  sobre el catálogo real, no sobre 48 bases falsas.

## No-objetivos (YAGNI)

- **Sin** llamadas a la API de fútbol en **runtime** (el backend solo lee el JSON; la API se
  consulta offline una vez vía script).
- **Sin** fix de performance N+1 (ver "Performance"): queda como **fast-follow**.
- **Sin** paginación nueva.
- **Sin** descargar/self-hostear imágenes (se hotlinkea la URL del CDN de la API).
- Cambios de modelo/DTO/frontend acotados al mínimo necesario para la foto (`imagenUrl`).

## Contexto del modelo (estado actual)

- `FiguritaBase` (`figuritas_base`): `id`, `numero`, `@DocumentReference` a `Seleccion`,
  `Equipo` (club), `CategoriaFigurita`, `Jugador`. **No tiene campo de imagen.**
- `Figurita` (`figuritas`): `id`, `@DocumentReference` a `FiguritaBase` + `owner` (`Usuario`).
  Instancia poseída; muchas instancias pueden apuntar a la misma base (repetidas).
- `Seleccion` (`selecciones`): `id`, `nombre`, `grupo` (hoy guarda la **confederación**).
- `Equipo` (`equipos`): `id`, `nombre` (club del jugador).
- `Jugador` (`jugadores`): `id`, `nombre`.
- `CategoriaFigurita` (`categorias_figurita`): `id`, `nombre` (Oro/Plata/Bronce).
- DTOs: `FiguritaResponseDTO` (colección/catálogo) y `FiguritaBaseDTO` (faltantes) — **ninguno
  tiene campo de imagen** hoy.
- Render front: [FiguritaCard.tsx](../../../frontend/src/pages/home/components/FiguritaCard.tsx)
  (data real) muestra solo el número en un cuadrito de color; [Figurita.tsx](../../../frontend/src/components/Figurita.tsx)
  tiene un `<img>` con `onError` pero está alimentado con **mock** (props `photo/age/position`
  que no existen en el DTO). **No hay pipeline de imágenes real.**
- Seeding actual: `DemoSeedService` (`POST /api/admin/seed-demo`, admin) dropea ~15
  colecciones y recrea todo. El `FiguritaBaseSeeder` (CommandLineRunner) está **comentado**.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Edición | Mundial FIFA 2026 (48 selecciones) |
| Fuente de datos | JSON estático generado una vez, commiteado en el repo |
| Tamaño | ~18 jugadores/selección ≈ ~850 bases |
| Escenario de demo | **Adaptar** seed-demo al catálogo real |
| Campo `grupo` | **Confederación** (CONMEBOL, UEFA, CONCACAF, …) |
| Categoría por figurita | **Una sola** por jugador (no jugadores × 3) |
| Imágenes | **Fotos reales** vía API pública, resueltas **offline** y embebidas en el JSON; **nullable + fallback** |
| API de imágenes | **TheSportsDB** (búsqueda por nombre, `strCutout`); API-Football descartada por rate limit free |
| Resolución de imágenes | **Script dev offline** (one-time), no en runtime; hotlink del CDN |
| Fix N+1 | **Fast-follow** aparte (fuera de esta tarea) |

## Arquitectura

### 1. Recurso de datos: JSON commiteado

**Ruta:** `backend/src/main/resources/data/figuritas-mundial-2026.json`

**Esquema** (centrado en jugador, sin duplicar selecciones/categorías):

```json
{
  "torneo": "FIFA World Cup 2026",
  "categorias": ["Oro", "Plata", "Bronce"],
  "selecciones": [
    {
      "nombre": "Argentina",
      "confederacion": "CONMEBOL",
      "jugadores": [
        { "nombre": "Lionel Messi", "club": "Inter Miami", "categoria": "Oro",
          "imagenUrl": "https://www.thesportsdb.com/images/media/player/cutout/....png" },
        { "nombre": "Emiliano Martínez", "club": "Aston Villa", "categoria": "Plata",
          "imagenUrl": null }
      ]
    }
  ]
}
```

Reglas:
- `numero` de cada `FiguritaBase` se asigna **secuencialmente al cargar** (1..N), en orden
  de aparición (selección por selección, jugador por jugador). Estable mientras no se reordene.
- `categoria` por jugador ∈ {Oro, Plata, Bronce}. Reparto: **Oro** = figuras, **Plata** = titulares, **Bronce** = resto.
- `confederacion` → `Seleccion.grupo`.
- `club` → `Equipo.nombre` (deduplicado).
- `imagenUrl` (string|null) → `FiguritaBase.imagenUrl`. La completa el script resolver (ver §2);
  queda `null` cuando no se encontró foto.

**Exactitud (caveat):** el JSON de texto es un *snapshot* a conocimiento de **enero 2026**.
Algún club/jugador puede estar desactualizado y puede faltar 1-2 selecciones de repechaje
(marzo 2026) → placeholder, se corrigen editando el JSON.

### 2. Resolver de imágenes (script dev, offline, one-time)

**Ubicación:** `scripts/figuritas/` (carpeta `/scripts/` **gitignored** por convención del repo,
igual que el helper de Trello). El **artefacto commiteado** es el JSON enriquecido, no el script.

Flujo:
1. Lee `figuritas-mundial-2026.json` (jugadores sin `imagenUrl`, o con `null`).
2. Por cada jugador: consulta **TheSportsDB** `searchplayers.php?p={nombre}`, elige el mejor match
   desambiguando por **nacionalidad/selección** y/o **club** para no traer la foto equivocada.
3. Toma `strCutout` (preferido; PNG recortado transparente) o `strThumb` como fallback de foto.
4. Escribe `imagenUrl` de vuelta en el JSON. No encontrado/ambiguo → `imagenUrl = null`.
5. Soporta un **mapa de overrides manuales** (`{ "nombre jugador": "url" }`) para corregir
   misses o matches equivocados a mano.
6. Throttling para respetar el rate limit del tier free. Loguea **cobertura** (% resuelto).

**Cobertura esperada: ~40-70%.** El resto queda `null` y usa el fallback del front (§5).
El backend **no** depende de la API: solo lee el JSON ya enriquecido.

### 3. `CatalogoService` (lógica compartida de carga)

Servicio nuevo (o método nuevo), **única fuente de verdad** usada por el loader de arranque y
por el seed-demo.

- DTOs de parseo (records con Jackson): `CatalogoJson(torneo, categorias, selecciones[])`,
  `SeleccionJson(nombre, confederacion, jugadores[])`,
  `JugadorJson(nombre, club, categoria, imagenUrl)`.
- Lectura vía `ObjectMapper` desde `ClassPathResource("data/figuritas-mundial-2026.json")`.
- `boolean catalogoVacio()` → `figuritaBaseRepository.count() == 0`.
- `ResultadoCarga cargarDesdeJson()`:
  1. `CategoriaFigurita` (dedup por nombre) → mapa nombre→entidad.
  2. `Seleccion` por cada selección (`grupo` = confederación).
  3. `Equipo` (clubes) deduplicados por nombre → mapa nombre→entidad.
  4. `Jugador`: uno por entrada.
  5. `FiguritaBase`: una por jugador, con `numero` secuencial, referencias resueltas y `imagenUrl`.
  - Respeta orden de persistencia por los `@DocumentReference`. Asume catálogo vacío (no borra solo).

### 4. Carga automática al arrancar (idempotente)

Reemplaza al `FiguritaBaseSeeder` comentado por un loader nuevo (`CatalogoSeeder`,
`CommandLineRunner` o `@EventListener(ApplicationReadyEvent)`):
- Al bootear: si `catalogoVacio()` → `cargarDesdeJson()` + log de conteos. Si no, **no hace nada**.
- No destructivo. Seguro en Atlas/prod: solo carga cuando la base está vacía.
- Se elimina el archivo muerto `configs/FiguritaBaseSeeder.java`.

### 5. Cambios de modelo / DTO / frontend para la foto

- **Modelo:** `FiguritaBase` gana `private String imagenUrl;` (nullable).
- **DTOs:** `FiguritaResponseDTO` y `FiguritaBaseDTO` ganan `imagenUrl`. `FiguritaService`
  lo incluye al mapear (`obtenerTodas`, `obtenerPorUserId`, `obtenerFaltantes`, `obtenerRepetidas`).
- **Frontend:** el type TS de la figurita + mappers en `api.ts` ganan `imagenUrl`. Las tarjetas
  reales ([FiguritaCard.tsx](../../../frontend/src/pages/home/components/FiguritaCard.tsx),
  `TarjetaColeccion.tsx`) renderizan `<img src={imagenUrl}>` cuando existe, con
  **fallback** (`onError` + ausencia) al diseño actual (número + color de categoría). No se
  agregan `age`/`position` (fuera de alcance).

### 6. `DemoSeedService` adaptado

- El **reset** (wipe de las ~15 colecciones) se mantiene.
- Tras el wipe, en vez de `seedCatalogo()` (48 falsas) → llama a `catalogoService.cargarDesdeJson()`.
- El escenario de trading (juanca + 10 usuarios, repetidas, intercambios, subastas, calificaciones)
  se arma sobre un **subset determinístico** del catálogo real (bases `numero` 1..~50, vía mapa
  `numero → FiguritaBase`), reusando casi igual la lógica existente (`MATRIZ`, propuestas, subastas).
- El resto (~800 bases) queda como **faltantes** → la feature "faltantes" se ve realista.
- `DemoSeedResultDTO.figuritasBase` pasa a reflejar el catálogo real (~850).
- Se elimina el `seedCatalogo()` hardcodeado.

### Performance (fuera de alcance — fast-follow)

Al escalar a ~850 bases, `GET /api/figuritas` (`obtenerTodas`) y `…/figuritas/faltantes`
sufren el **N+1 lazy** existente (cada base dispara ~4-5 queries por los `@DocumentReference`).
Per-usuario sigue liviano; catálogo global y faltantes se ponen lentos. Fix para otra tarea:
batch-load de referenciados o `$lookup`/aggregation.

## Archivos afectados

**Nuevos**
- `backend/src/main/resources/data/figuritas-mundial-2026.json` (con `imagenUrl` ya resuelta)
- `backend/src/main/java/com/grupo3/tp/service/CatalogoService.java` (+ records de parseo)
- `backend/src/main/java/com/grupo3/tp/configs/CatalogoSeeder.java` (runner de arranque)
- `scripts/figuritas/` (resolver de imágenes — gitignored; + README)

**Modificados**
- `backend/.../models/FiguritaBase.java` (+ `imagenUrl`)
- `backend/.../dtos/FiguritaResponseDTO.java` y `FiguritaBaseDTO.java` (+ `imagenUrl`)
- `backend/.../service/FiguritaService.java` (mapear `imagenUrl`)
- `backend/.../service/DemoSeedService.java` (usa `CatalogoService`; reparte sobre subset real)
- `frontend/.../FiguritaCard.tsx`, `frontend/.../coleccion/components/TarjetaColeccion.tsx`
  (render foto + fallback), tipos/mappers en `frontend/src/services/api.ts` y `frontend/src/types/`

**Eliminados**
- `backend/.../configs/FiguritaBaseSeeder.java` (código comentado muerto)

**Opcional**
- `FiguritaBaseRepository.findByNumero(Integer)` si conviene sobre indexar en memoria.

## Testing

- **Parseo + carga:** el JSON deserializa; conteos esperados (48 selecciones, 3 categorías,
  ~850 jugadores/bases); `numero` único y secuencial; referencias resueltas; `imagenUrl` se
  persiste tal cual (incluyendo `null`).
- **Idempotencia:** segundo arranque con catálogo presente → no duplica.
- **Demo coherente:** tras seed-demo, juanca tiene repetidas, hay sugerencias/intercambios/subastas
  sobre el subset real, y el resto del catálogo aparece como faltantes.
- **Fallback de imagen (front):** `imagenUrl` null o `onError` → se muestra el diseño generado,
  no una imagen rota.

## Riesgos aceptados

- **Licencia / app pública:** se hotlinkean fotos de un CDN de terceros en una app accesible
  públicamente. Aceptado para el TP; mitigable luego pasando a self-host o quitando fotos.
- **Cobertura parcial (~40-70%):** muchas figuritas quedarán con el diseño generado, no foto.
- **Link rot / matching equivocado:** las URLs pueden romperse y algún match puede traer la foto
  de otro jugador homónimo → mitigado con desambiguación por selección/club, overrides manuales
  y fallback del front.

## Rollout a producción (Atlas)

El loader de arranque solo carga si la base está **vacía**, así que **no** reemplaza datos
existentes en Atlas automáticamente. Para instalar el catálogo real en prod se corre **una vez**
`seed-demo` (dropea + recarga real) — el mismo botón ya vivo en prod (destructivo). Documentar
este paso al deployar.

## Mantenimiento del dato

Corregir jugadores/clubes/categorías/fotos = editar el JSON (o el mapa de overrides + re-correr
el resolver) y re-poblar (seed-demo, o limpiar el catálogo). El `numero` se mantiene estable
mientras no se reordenen las entradas.
