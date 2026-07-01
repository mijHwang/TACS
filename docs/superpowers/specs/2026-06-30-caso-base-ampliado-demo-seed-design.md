# Caso base ampliado — 3 protagonistas × 1 semana de uso simulado

**Fecha:** 2026-06-30
**Componente:** `backend` — `DemoSeedService` y colaboradores
**Objetivo:** Ampliar la siembra de demo para que, tras recargar la base, existan **3 personas
principales** (no solo `juanca`) que ejerciten el set completo de User Stories, con la actividad
**repartida a lo largo de una semana** (los 7 días previos al día de recarga) y un **admin**.

---

## 1. Motivación

Hoy `DemoSeedService.seed()` crea un único protagonista (`juanca`) rodeado de 10 contrapartes
"finas", y **toda** la actividad ocurre en `LocalDateTime.now()` — no hay línea de tiempo. Se quiere
un caso base que parezca "una semana de uso real" por 3 usuarios clave, cada uno con historia propia
(publicaciones, trueques, subastas, ofertas, calificaciones, sugerencias), de modo que al loguearse
con cualquiera de los 3 se vea un dashboard rico y un feed de notificaciones creíble.

## 2. Decisiones tomadas (con el usuario)

1. **Línea de tiempo:** backdatear **solo** lo que ya tiene campo de fecha. **No** se modifican los
   modelos de dominio. (`SolicitudDeIntercambio` y `Calificacion` quedan sin fecha; la semana se
   percibe por `Notificacion.fecha`, `Subasta.horaInicio/horaFin`, `Oferta.fechaOferta`,
   `Intercambio.fecha` y `FiguritaPublicada.fechaPublicacion`.)
2. **Protagonistas:** `juanca` + `sofia` + `mateo`. Los otros 8 usuarios quedan como **reparto**
   (actividad liviana). El admin se mantiene.
3. **Cobertura:** **cada** protagonista ejercita el set completo de US individualmente (no se
   reparten las US entre ellos).
4. **Estructura de código:** descomponer (Enfoque B) en colaboradores en vez de engordar el
   orquestador actual.

## 3. Alcance

**Incluye:** reescritura de la siembra de demo (usuarios, matriz de ownership, publicaciones,
propuestas, subastas, ofertas, calificaciones), mecanismo de backdating por evento, corrección de
dos gaps de `FiguritaPublicada`, extensión aditiva de `DemoSeedResultDTO`, **auto-seed idempotente
al levantar el docker local** (§12), y tests.

**No incluye:** cambios en modelos de dominio; cambios de UI (salvo, opcional y fuera de este spec,
mostrar los 3 protagonistas en el resultado del botón seed-demo); Telegram/alertas proactivas (US11
proactivo sigue sin implementar); nuevas User Stories.

## 4. Cohorte

| Rol | Usuarios | Password | Actividad |
|---|---|---|---|
| Admin | `admin` | `adminpass123` | Consume estadísticas (US12) |
| **Protagonistas** | `juanca`, `sofia`, `mateo` | `demo1234` | Set US completo (ver §7) |
| Reparto | `valen`, `cami`, `nico`, `lucas`, `martina`, `thiago`, `agus`, `flor` | `demo1234` | Contrapartes de propuestas/ofertas/sugerencias |

Credenciales sin cambios respecto de hoy (compatibilidad con la cohorte demo ya conocida).

## 5. Mecanismo de "1 semana" (sin tocar modelos)

- **Ventana:** `D-6 … D0`, con `D0` = día de recarga (hoy). Estado "vivo" al `D0`.
- **`DemoTimeline`** (nuevo colaborador / clase interna):
  - `LocalDateTime dia(int offsetDias, int hora)` → medianoche de hoy + offset, a la hora dada.
    `offset` negativo = pasado.
  - `void enDia(LocalDateTime cuando, Runnable accion)` → **wrapper de evento**: snapshotea los IDs
    existentes en `notificaciones`, `intercambios` y `ofertas`, corre `accion`, y **backdatea a
    `cuando`** los documentos nuevos de esas 3 colecciones (los services de dominio setean `now()`
    internamente como efecto colateral). Esto data cada evento **y sus notificaciones** de forma
    coherente sin duplicar lógica.
- **Entidades que el seed controla directo** se estampan explícito (no via wrapper):
  - `Subasta.horaInicio` = día de apertura (pasado); `Subasta.horaFin` = futuro (`D+1…D+3`) para las
    activas, o pasado para las finalizadas.
  - `FiguritaPublicada.fechaPublicacion` = día de publicación.
- **Visibilidad de la semana:** feed de notificaciones repartido en ≥5 días distintos, subastas con
  cuentas regresivas escalonadas, e historial de intercambios/publicaciones fechado.

> Nota: `Sugerencia.generadaEn` se deja en `now()` (se "regeneran hoy", día de recarga). No forma
> parte de la ventana histórica.

## 6. Ownership / matriz de figuritas

### 6.1 Subconjunto del catálogo
Se amplía el subconjunto de demo de **48 → ~60 bases** (`primerasBasesPorNumero(60)`). Argentina
sigue siendo la 1ª selección del JSON (bases **1..18**), lo que ancla la condición **"Solo
Argentina"** de una subasta. Más bases ⇒ colecciones parciales más ricas ⇒ más faltantes (US2) y
más candidatos de sugerencia (US4).

### 6.2 Invariantes de la matriz (lo que debe cumplirse; los números finales se ajustan en impl.)
Para **cada protagonista `P`**:
- Posee ~15 bases; **faltan** ≥ la mitad del catálogo (US2 = catálogo − poseídas).
- Tiene suficientes **instancias repetidas** (base con `count ≥ 2`) para cubrir, **sin reusar la
  misma instancia física**: 2 publicaciones + 1 subasta + 1–2 ofrecidas en propuestas + 1 ofrecida
  en una subasta ajena. En la práctica: `x2` en las bases que se usan en una actividad, `x1` en el
  resto.
- Existe **match bidireccional** con al menos otro protagonista y con parte del reparto: `P` tiene
  una repetida que a la contraparte le falta **y** a `P` le falta una repetida de la contraparte
  (condición exacta que evalúa `SugerenciaService.regenerarTodas`).

### 6.3 Matriz representativa (sujeta a ajuste fino de instancias)
Bloques de bases por usuario, con repetidas marcadas `x2`:

| Usuario | Bases poseídas (repetidas en negrita) |
|---|---|
| `juanca` | **1,2,3,4,5,7**(x2), 6,8,9,10,11,12,13,14,15 |
| `sofia` | 10,11,12,13,14,15, **16,17,18,19,20**(x2), 21,22,23,24 |
| `mateo` | 22,23,24, **25,26,27,28,29**(x2), 30,31,32,33,34 |
| `valen` | **31**(x2),35,36 |
| `cami` | **37**(x2),16,38 |
| `nico` | **41**(x2),42,43 |
| `lucas` | **44**(x2),45,46 |
| `martina` | **47**(x2),48,49 |
| `thiago` | **50**(x2),51,52 |
| `agus` | **53**(x2),54,55 |
| `flor` | **56**(x2),57,1 |

Matches bidireccionales que habilita: `juanca↔sofia` (Argentina 1..7 ↔ 16..20), `juanca↔mateo`
(1..7 ↔ 25..29), `sofia↔mateo` (16..20 ↔ 25..29), más varios protagonista↔reparto.

### 6.4 Pool de instancias
`DemoCohorte` mantiene, por `(usuario, base)`, una lista de instancias `Figurita` y un helper
`tomar(usuario, base)` que **consume** (pop) una instancia libre al asignarla a una actividad. Evita
que la misma `Figurita` física quede simultáneamente publicada, subastada y ofrecida (hoy es fácil
pisarse porque `FiguritaPublicadaService.publicar()` no conoce subastas ni solicitudes). Si un
`tomar` se queda sin instancias, el seed falla ruidosamente (invariante roto), no en silencio.

## 7. Narrativa de los 7 días y cobertura US

| Día | Evento | US | Efecto backdated |
|---|---|---|---|
| **D-6** | juanca, sofia y mateo **publican** 2 repetidas c/u | US1 | `FiguritaPublicada.fechaPublicacion = D-6` |
| **D-5** | mateo **propone** a juanca (ofrece repetida, pide una de juanca); valen propone a sofia | US5 | notif a juanca/sofia @ D-5 |
| **D-4** | juanca **acepta** a mateo (→ transfer + `Intercambio` + notif); sofia **rechaza** a valen | US9 | `Intercambio.fecha = D-4`, notifs @ D-4 |
| **D-3** | sofia abre **subasta "Solo Argentina"** (cierra `D+2`); juanca abre subasta (cierra `D+1`); mateo publica 1 más | US6 | `horaInicio=D-3`, `horaFin` futuro |
| **D-2** | juanca **oferta** en la de sofia (base 7 = Argentina, cumple condición); mateo y nico ofertan en la de juanca | US7 | `Oferta.fechaOferta = D-2`, notifs @ D-2 |
| **D-1** | juanca propone a sofia y sofia **acepta** (→ `Intercambio`); **calificaciones** cruzadas de los intercambios cerrados | US5/US9/US10 | `Intercambio.fecha = D-1`, notifs @ D-1 |
| **D0** (hoy) | Estado vivo: propuestas **PENDIENTES** accionables (reparto→protagonista y protagonista→reparto), subastas EN_CURSO, **sugerencias** regeneradas, notificaciones sin leer | US4/US8/US11 | — |

Además, **una** subasta más antigua (abierta `D-6`, cerrada `D-3`, estado `FINALIZADA`) para dar
variedad al historial.

**Cobertura resultante — cada protagonista:** US1 ✅ · US2 ✅ (colección parcial ⇒ faltantes) ·
US4 ✅ · US5 ✅ · US6 ✅ · US7 ✅ · US8 ✅ · US9 ✅ · US10 ✅ (reputación > 0) · US11 ✅
(notificaciones in-app). **Admin:** US12 ✅ (stats alimentadas).

## 8. Gaps a corregir

1. **Reset de publicaciones:** agregar `"figuritas_publicadas"` al array `COLECCIONES` de
   `DemoSeedService` (hoy no se limpia ⇒ publicaciones viejas quedan colgando apuntando a figuritas
   borradas).
2. **Sembrar publicaciones:** crear `FiguritaPublicada` reusando `FiguritaPublicadaService.publicar(
   FiguritaPublicadaRequestDTO)` (usuarioId, figuritaBaseId, cantidad) y luego backdatear
   `fechaPublicacion` (fetch por id → set → save), ya que el service la fija en `now()`.
3. **`DemoSeedResultDTO`:** extensión **aditiva** — nuevo campo
   `List<ProtagonistaDTO> protagonistas` (`{username, password}`). Se **mantienen** los campos
   `protagonista*` actuales apuntando a `juanca` para no romper el front del botón seed-demo. Sumar
   `figuritasPublicadas` al conteo del resumen.

## 9. Arquitectura de código (Enfoque B)

```
DemoSeedService.seed()
  reset() → catalogoService.cargarDesdeJson()
         → cohorte.seedUsuarios() / seedColecciones()   (DemoCohorte)
         → escenas por día (usan timeline.enDia + cohorte.tomar)
         → sugerenciaService.regenerarTodas()
         → DemoSeedResultDTO

DemoTimeline   — dia(offset,hora), enDia(cuando, accion) {backdatea notif/intercambio/oferta nuevos}
DemoCohorte    — MATRIZ, seedUsuarios(), seedColecciones(), tomar(usuario, base)  [pool de instancias]
escenas        — seedPublicaciones(), seedPropuestas(), seedSubastas(), seedCalificaciones()
                 (métodos de DemoSeedService que reciben timeline + cohorte)
```

`DemoTimeline` y `DemoCohorte` pueden ser clases nuevas (package `service`, visibilidad de paquete)
o clases internas estáticas de `DemoSeedService`; se decide en el plan según prolijidad de tests. El
código sigue siendo **de demo**: reusa los services de dominio para que los efectos colaterales
(notificaciones, intercambios, transferencias de ownership) ocurran como en uso real.

**Orden crítico:** las transferencias de ownership (aceptar propuestas) ocurren **antes** de
`regenerarTodas()`, para que las sugerencias reflejen el estado final.

## 10. Testing

Adaptar `DemoSeedServiceTest` (hoy parte de los 90 tests). Nuevos asserts sobre el resultado del
`seed()` (con Mongo de test / mocks según el patrón vigente del archivo):
- Existen `admin` + 3 protagonistas + 8 reparto.
- Cada protagonista: reputación > 0, ≥1 publicación, ≥1 subasta creada, ≥1 oferta emitida, ≥1
  propuesta enviada y ≥1 recibida.
- Notificaciones repartidas en **≥5 días distintos** (probar el backdating del wrapper).
- Colección `figuritas_publicadas` reseteada al arrancar (no quedan docs previos).
- **Sin instancias duplicadas:** ninguna `Figurita` aparece a la vez en una publicación DISPONIBLE y
  en una subasta EN_CURSO / solicitud PENDIENTE.
- Hay ≥1 sugerencia bidireccional para cada protagonista.

`cd backend && ./mvnw test` → verde.

## 11. Riesgos y mitigaciones

- **Colisión de instancias** (misma `Figurita` en dos actividades): mitigado por el pool `tomar()` +
  test dedicado.
- **Backdating frágil** (identificar los docs nuevos por evento): el wrapper usa diff de IDs pre/post
  sobre colecciones concretas; es determinístico y single-thread. Riesgo bajo.
- **Volumen/tiempo del seed** contra Atlas de prod: el seed sigue siendo O(decenas) de docs; sin
  cambios de orden de magnitud. El botón seed-demo ya dropea colecciones en prod (comportamiento
  existente, no lo introduce este cambio).
- **Trabajo en paralelo:** se implementa en un **git worktree** aislado (el usuario corre varias
  sesiones sobre el mismo árbol de TACS).

## 12. Auto-seed al levantar docker (idempotente)

Al levantar el docker con el Mongo local, si la base está **vacía** se siembra el escenario
automáticamente (con catálogo de figuritas incluido, ya que `seed()` llama a
`catalogoService.cargarDesdeJson()`). Decisión con el usuario: **idempotente** (seed-if-empty), no
"resetear en cada arranque".

- **Componente:** `DemoSeedBootstrap` (`@Component`) que escucha `ApplicationReadyEvent` (Mongo ya
  disponible: `backend depends_on mongo: service_healthy`). En el handler: si
  `usuarioRepository.count() == 0` → `demoSeedService.seed()`; si no, loguea y no hace nada. Nunca
  wipea data existente.
- **Gate:** `@ConditionalOnProperty(name = "demo.seed-on-startup", havingValue = "true")` ⇒ el bean
  ni siquiera se instancia cuando está apagado (tests y prod no lo cargan, no requieren Mongo).
- **Binding:** `application.properties` → `demo.seed-on-startup=${SEED_ON_STARTUP:false}` (default
  apagado).
- **Encendido/apagado por entorno:**
  - `docker-compose.yml` (base, dev local): backend env `SEED_ON_STARTUP=${SEED_ON_STARTUP:-true}`
    (prendido por defecto local).
  - `docker-compose.prod.yml` (override prod): backend env `SEED_ON_STARTUP=false` **explícito**.
    ⚠️ Crítico: el override de prod hoy solo toca `frontend`; como prod usa el mismo `docker-compose.yml`
    base (que ahora corre el Mongo del contenedor), sin este apagado prod heredaría el flag. El
    seed-if-empty ya evita el wipe (prod está seedeado), pero el flag en `false` es la barrera dura.
- **Re-seed manual local:** `docker compose down -v` (borra el volumen) y volver a levantar, o el
  botón admin `POST /admin/seed-demo`.

## 13. Criterios de aceptación

1. Tras `seed()`, loguear como `juanca`, `sofia` o `mateo` muestra en cada caso: figuritas propias,
   publicaciones, propuestas enviadas/recibidas (con ≥1 pendiente accionable), subasta propia activa,
   oferta emitida, reputación con estrellas y ≥1 sugerencia.
2. El feed de notificaciones de cada protagonista abarca varios días de la última semana.
3. La página Buscar muestra publicaciones de los 3 protagonistas (y no publicaciones colgadas de
   seeds anteriores).
4. `admin` ve estadísticas coherentes con la actividad sembrada.
5. `./mvnw test` verde.
6. `docker compose up` sobre un volumen fresco deja el escenario sembrado sin intervención manual;
   un segundo `up` (con data ya cargada) **no** re-siembra ni wipea.
