# Caso base ampliado (3 protagonistas × 1 semana) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar `DemoSeedService` para sembrar 3 protagonistas (juanca, sofia, mateo) + admin + reparto, con actividad repartida a lo largo de la semana previa al día de recarga, cubriendo el set completo de User Stories por protagonista.

**Architecture:** Se extraen los dos mecanismos propensos a bugs a clases testeables (`DemoTimeline` = fechas relativas + backdating de efectos colaterales; `InstancePool` = asignación de instancias sin doble uso). La cohorte, la matriz de ownership y las "escenas" narrativas quedan como métodos de `DemoSeedService`, que reusa los services de dominio para que los efectos colaterales (notificaciones, intercambios, transferencias) ocurran como en uso real. No se tocan modelos de dominio.

**Tech Stack:** Java 21, Spring Boot 4, Spring Data MongoDB, Lombok, JUnit 5 + Mockito, Maven.

## Global Constraints

- No modificar modelos de dominio (decisión del spec). La "semana" se percibe solo por campos de fecha existentes: `Notificacion.fecha`, `Intercambio.fecha`, `Oferta.fechaOferta`, `Subasta.horaInicio/horaFin`, `FiguritaPublicada.fechaPublicacion`.
- Métodos y variables en español, consistente con el código existente.
- Credenciales sin cambios: protagonistas `demo1234`, admin `adminpass123`.
- Reusar services de dominio (no insertar documentos a mano) salvo el backdating post-hoc.
- Los tests nuevos siguen el patrón Mockito unitario del repo (como `DemoSeedServiceTest`); **no** se agrega Testcontainers/`@DataMongoTest` (el repo no tiene harness de integración y el CI no corre `mvn test`). El `seed()` completo se valida **manualmente** (Task 6).
- No commitear ni pushear salvo pedido explícito del usuario (preferencia permanente). Los pasos "Commit" quedan como recordatorio del flujo TDD pero **no se ejecutan sin confirmación**.
- Regla de partición de instancias (evita doble uso con `FiguritaPublicadaService.publicar`, que auto-selecciona por base): **las bases que se publican nunca se pasan a `pool.tomar()`**. Bases de publicación por usuario: juanca `1,2`; sofia `19,20`; mateo `28,29,30`. El resto de las repes son de pool.
- Auto-seed (Task 6): idempotente (solo si la base está vacía), gateado por `SEED_ON_STARTUP` (env → property `demo.seed-on-startup`), prendido en el compose base y **apagado explícito en `docker-compose.prod.yml`**. ⚠️ Prod usa el mismo `docker-compose.yml` base (Mongo del contenedor): sin el apagado en el override, prod heredaría el flag. Nunca wipea data existente.

---

### Task 1: `DemoTimeline` — fechas relativas + wrapper de backdating

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/service/DemoTimeline.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/DemoTimelineTest.java`

**Interfaces:**
- Produces:
  - `DemoTimeline(NotificacionRepository, IntercambioRepository, OfertaRepository)`
  - `LocalDateTime dia(int offsetDias, int hora)`
  - `void enDia(LocalDateTime cuando, Runnable accion)`

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/grupo3/tp/service/DemoTimelineTest.java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.repository.IntercambioRepository;
import com.grupo3.tp.repository.NotificacionRepository;
import com.grupo3.tp.repository.OfertaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DemoTimelineTest {

    @Mock NotificacionRepository notificacionRepo;
    @Mock IntercambioRepository intercambioRepo;
    @Mock OfertaRepository ofertaRepo;

    @Test
    void diaGeneraFechasRelativasAHoy() {
        DemoTimeline t = new DemoTimeline(notificacionRepo, intercambioRepo, ofertaRepo);
        LocalDateTime hoy9 = t.dia(0, 9);
        LocalDateTime haceSeis = t.dia(-6, 9);
        assertEquals(9, hoy9.getHour());
        assertEquals(0, hoy9.getMinute());
        assertEquals(hoy9.minusDays(6), haceSeis);
        assertTrue(haceSeis.isBefore(hoy9));
    }

    @Test
    void enDiaBackdateaSoloLasNotificacionesNuevas() {
        Notificacion n0 = Notificacion.builder().id("n0").build();
        Notificacion n1 = Notificacion.builder().id("n1").build();
        LocalDateTime cuando = LocalDateTime.of(2020, 1, 1, 10, 0);
        when(notificacionRepo.findAll()).thenReturn(List.of(n0), List.of(n0, n1));
        when(intercambioRepo.findAll()).thenReturn(List.of());
        when(ofertaRepo.findAll()).thenReturn(List.of());

        DemoTimeline t = new DemoTimeline(notificacionRepo, intercambioRepo, ofertaRepo);
        t.enDia(cuando, () -> { /* la acción "crea" n1 (simulado por el mock) */ });

        assertEquals(cuando, n1.getFecha());
        assertNull(n0.getFecha());
        verify(notificacionRepo).save(n1);
        verify(notificacionRepo, never()).save(n0);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=DemoTimelineTest`
Expected: FAIL con error de compilación ("cannot find symbol: class DemoTimeline").

- [ ] **Step 3: Write minimal implementation**

```java
// backend/src/main/java/com/grupo3/tp/service/DemoTimeline.java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Intercambio;
import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.models.Oferta;
import com.grupo3.tp.repository.IntercambioRepository;
import com.grupo3.tp.repository.NotificacionRepository;
import com.grupo3.tp.repository.OfertaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * Reloj simulado del seed de demo: genera fechas relativas al día de recarga y
 * backdatea los efectos colaterales (notificaciones, intercambios, ofertas) que los
 * services de dominio crean con {@code now()} durante un evento. Código de demo.
 */
class DemoTimeline {

    private final NotificacionRepository notificacionRepo;
    private final IntercambioRepository intercambioRepo;
    private final OfertaRepository ofertaRepo;

    DemoTimeline(NotificacionRepository notificacionRepo,
                 IntercambioRepository intercambioRepo,
                 OfertaRepository ofertaRepo) {
        this.notificacionRepo = notificacionRepo;
        this.intercambioRepo = intercambioRepo;
        this.ofertaRepo = ofertaRepo;
    }

    /** Hoy (00:00) + offsetDias, a la hora dada. offset negativo = pasado. */
    LocalDateTime dia(int offsetDias, int hora) {
        return LocalDate.now().atStartOfDay().plusDays(offsetDias).plusHours(hora);
    }

    /**
     * Corre {@code accion} y backdatea a {@code cuando} las notificaciones/intercambios/ofertas
     * creados durante ella (detectados por diferencia de ids antes/después).
     */
    void enDia(LocalDateTime cuando, Runnable accion) {
        Set<String> notifAntes = ids(notificacionRepo.findAll(), Notificacion::getId);
        Set<String> interAntes = ids(intercambioRepo.findAll(), Intercambio::getId);
        Set<String> ofertaAntes = ids(ofertaRepo.findAll(), Oferta::getId);

        accion.run();

        for (Notificacion n : notificacionRepo.findAll()) {
            if (!notifAntes.contains(n.getId())) { n.setFecha(cuando); notificacionRepo.save(n); }
        }
        for (Intercambio it : intercambioRepo.findAll()) {
            if (!interAntes.contains(it.getId())) { it.setFecha(cuando); intercambioRepo.save(it); }
        }
        for (Oferta o : ofertaRepo.findAll()) {
            if (!ofertaAntes.contains(o.getId())) { o.setFechaOferta(cuando); ofertaRepo.save(o); }
        }
    }

    private <T> Set<String> ids(List<T> list, Function<T, String> getId) {
        Set<String> s = new HashSet<>();
        for (T t : list) s.add(getId.apply(t));
        return s;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=DemoTimelineTest`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit** (solo si el usuario lo pide)

```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoTimeline.java backend/src/test/java/com/grupo3/tp/service/DemoTimelineTest.java
git commit -m "feat(demo-seed): DemoTimeline con fechas relativas y backdating de efectos"
```

---

### Task 2: `InstancePool` — asignación de instancias sin doble uso

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/service/InstancePool.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/InstancePoolTest.java`

**Interfaces:**
- Produces:
  - `InstancePool()`
  - `void add(String username, int base, Figurita f)`
  - `Figurita tomar(String username, int base)` — lanza `IllegalStateException` si no hay libres
  - `int disponibles(String username, int base)`

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/grupo3/tp/service/InstancePoolTest.java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Figurita;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class InstancePoolTest {

    @Test
    void tomarConsumeInstanciasDistintasYLanzaAlAgotarse() {
        InstancePool pool = new InstancePool();
        Figurita f1 = Figurita.builder().id("f1").build();
        Figurita f2 = Figurita.builder().id("f2").build();
        pool.add("juanca", 1, f1);
        pool.add("juanca", 1, f2);

        assertEquals(2, pool.disponibles("juanca", 1));
        Figurita a = pool.tomar("juanca", 1);
        Figurita b = pool.tomar("juanca", 1);
        assertNotEquals(a.getId(), b.getId());
        assertEquals(0, pool.disponibles("juanca", 1));
        assertThrows(IllegalStateException.class, () -> pool.tomar("juanca", 1));
    }

    @Test
    void tomarSobreClaveInexistenteLanza() {
        InstancePool pool = new InstancePool();
        assertEquals(0, pool.disponibles("sofia", 99));
        assertThrows(IllegalStateException.class, () -> pool.tomar("sofia", 99));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=InstancePoolTest`
Expected: FAIL ("cannot find symbol: class InstancePool").

- [ ] **Step 3: Write minimal implementation**

```java
// backend/src/main/java/com/grupo3/tp/service/InstancePool.java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Figurita;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

/**
 * Pool de instancias de figurita por (usuario, base). Cada {@code tomar} consume una
 * instancia libre, evitando que la misma figurita física quede asignada a dos
 * actividades del seed (publicar / subastar / ofrecer / comerciar). Código de demo.
 */
class InstancePool {

    private final Map<String, Deque<Figurita>> pool = new HashMap<>();

    private String key(String username, int base) { return username + "#" + base; }

    void add(String username, int base, Figurita f) {
        pool.computeIfAbsent(key(username, base), k -> new ArrayDeque<>()).add(f);
    }

    /** Saca una instancia libre; lanza si (usuario, base) no tiene más. */
    Figurita tomar(String username, int base) {
        Deque<Figurita> d = pool.get(key(username, base));
        if (d == null || d.isEmpty()) {
            throw new IllegalStateException(
                    "Sin instancias libres de la base " + base + " para " + username);
        }
        return d.poll();
    }

    int disponibles(String username, int base) {
        Deque<Figurita> d = pool.get(key(username, base));
        return d == null ? 0 : d.size();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=InstancePoolTest`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit** (solo si el usuario lo pide)

```bash
git add backend/src/main/java/com/grupo3/tp/service/InstancePool.java backend/src/test/java/com/grupo3/tp/service/InstancePoolTest.java
git commit -m "feat(demo-seed): InstancePool para asignar instancias sin doble uso"
```

---

### Task 3: Extender `DemoSeedResultDTO` con los 3 protagonistas

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/dtos/ProtagonistaDTO.java`
- Modify: `backend/src/main/java/com/grupo3/tp/dtos/DemoSeedResultDTO.java`

**Interfaces:**
- Produces:
  - `ProtagonistaDTO(String username, String password)`
  - `DemoSeedResultDTO.builder().protagonistas(List<ProtagonistaDTO>).figuritasPublicadas(int)...`

Nota: cambio **aditivo**. Se mantienen `protagonistaUsername/Password` (apuntan a juanca) para no romper el front (`SeedResult` en `adminService.ts` ignora campos extra). No se toca el frontend. Los DTOs no se testean en este repo (convención); la verificación es que compila y se puebla en Task 5.

- [ ] **Step 1: Crear `ProtagonistaDTO`**

```java
// backend/src/main/java/com/grupo3/tp/dtos/ProtagonistaDTO.java
package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Credencial de un protagonista de la demo, para mostrar en la UI. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProtagonistaDTO {
    private String username;
    private String password;
}
```

- [ ] **Step 2: Agregar campos a `DemoSeedResultDTO`**

En `backend/src/main/java/com/grupo3/tp/dtos/DemoSeedResultDTO.java`, agregar el import y los dos campos nuevos.

Agregar debajo de `import lombok.NoArgsConstructor;`:

```java
import java.util.List;
```

Agregar el campo `figuritasPublicadas` justo después de `private int figuritas;`:

```java
    private int figuritasPublicadas;
```

Agregar el campo `protagonistas` justo después de `private int calificaciones;`:

```java
    private List<ProtagonistaDTO> protagonistas;
```

- [ ] **Step 3: Verificar que compila**

Run: `cd backend && ./mvnw -q -DskipTests compile`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit** (solo si el usuario lo pide)

```bash
git add backend/src/main/java/com/grupo3/tp/dtos/ProtagonistaDTO.java backend/src/main/java/com/grupo3/tp/dtos/DemoSeedResultDTO.java
git commit -m "feat(demo-seed): DemoSeedResultDTO expone los 3 protagonistas y count de publicaciones"
```

---

### Task 4: Wiring de `FiguritaPublicada` en `DemoSeedService` + gap de reset

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/DemoSeedServiceTest.java`

**Interfaces:**
- Consumes: `FiguritaPublicadaService.publicar(FiguritaPublicadaRequestDTO)`, `FiguritaPublicadaRepository` (extends `MongoRepository<FiguritaPublicada,String>`).
- Produces: `DemoSeedService.COLECCIONES` con 16 entradas (incluye `"figuritas_publicadas"`); campos `figuritaPublicadaService`, `figuritaPublicadaRepo` inyectados.

- [ ] **Step 1: Actualizar el test de reset (rojo primero)**

En `DemoSeedServiceTest.java`, reemplazar el método `resetDropeaLas15Colecciones` por:

```java
    @Test
    void resetDropeaLas16ColeccionesIncluyendoPublicadas() {
        service.reset();
        for (String c : DemoSeedService.COLECCIONES) {
            verify(mongoTemplate).dropCollection(c);
        }
        assertEquals(16, DemoSeedService.COLECCIONES.length);
        assertTrue(java.util.Arrays.asList(DemoSeedService.COLECCIONES).contains("figuritas_publicadas"));
    }
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedServiceTest#resetDropeaLas16ColeccionesIncluyendoPublicadas`
Expected: FAIL (`expected: <16> but was: <15>`).

- [ ] **Step 3: Agregar la colección al array `COLECCIONES`**

En `DemoSeedService.java`, reemplazar el array `COLECCIONES` por (agrega `"figuritas_publicadas"` al final):

```java
    /** Las 16 colecciones de la app, a vaciar en el reset. */
    public static final String[] COLECCIONES = {
        "usuarios", "figuritas", "figuritas_base", "categorias_figurita", "condiciones",
        "equipos", "jugadores", "selecciones", "intercambios", "notificaciones",
        "ofertas", "solicitudes_intercambio", "subastas", "sugerencias", "calificaciones",
        "figuritas_publicadas"
    };
```

- [ ] **Step 4: Inyectar `FiguritaPublicadaService` y `FiguritaPublicadaRepository`**

En `DemoSeedService.java`, agregar los dos campos junto a los demás (después de `private final FiguritaRepository figuritaRepo;`):

```java
    private final FiguritaPublicadaService figuritaPublicadaService;
    private final FiguritaPublicadaRepository figuritaPublicadaRepo;
```

Agregar los dos parámetros al final de la lista del constructor (después de `FiguritaRepository figuritaRepo`):

```java
                           FiguritaRepository figuritaRepo,
                           FiguritaPublicadaService figuritaPublicadaService,
                           FiguritaPublicadaRepository figuritaPublicadaRepo) {
```

Y las dos asignaciones al final del cuerpo del constructor (después de `this.figuritaRepo = figuritaRepo;`):

```java
        this.figuritaPublicadaService = figuritaPublicadaService;
        this.figuritaPublicadaRepo = figuritaPublicadaRepo;
```

El import `com.grupo3.tp.repository.*` ya trae `FiguritaPublicadaRepository`; `FiguritaPublicadaService` está en el mismo paquete (`service`), no requiere import.

- [ ] **Step 5: Correr los tests de `DemoSeedService` y verlos pasar**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedServiceTest`
Expected: PASS (4 tests). Los `@InjectMocks` pasan `null` para las deps nuevas (los tests existentes no las ejercitan).

- [ ] **Step 6: Commit** (solo si el usuario lo pide)

```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java backend/src/test/java/com/grupo3/tp/service/DemoSeedServiceTest.java
git commit -m "feat(demo-seed): reset limpia figuritas_publicadas + inyecta FiguritaPublicada"
```

---

### Task 5: Reescribir la orquestación de `DemoSeedService` (cohorte + escenas + seed)

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`

**Interfaces:**
- Consumes: `DemoTimeline` (Task 1), `InstancePool` (Task 2), `ProtagonistaDTO`/`DemoSeedResultDTO` (Task 3), deps de Task 4, y los services de dominio ya inyectados.
- Produces: `seed()` reescrito; métodos `seedUsuarios()`, `seedColecciones()→InstancePool`, `seedPublicaciones(...)`, `seedPropuestas(...)`, `seedSubastas(...)`; constantes `PROTAGONISTAS`, `CAST`; `MATRIZ` redefinida.

Todo este task es interdependiente (cambia la representación de ownership de `Map<...>` a `InstancePool`, lo que ripplea a todas las escenas) y solo compila completo. Al final: build verde y los 4 tests de `DemoSeedService` + mecanismos siguen pasando. El comportamiento end-to-end se valida en Task 6.

- [ ] **Step 1: Reemplazar las constantes de cohorte y la `MATRIZ`**

En `DemoSeedService.java`, reemplazar el bloque `PROTAGONISTA` + `CONTRAPARTES` + `MATRIZ` por:

```java
    static final String PASS_DEMO = "demo1234";
    static final String PASS_ADMIN = "adminpass123";
    static final List<String> PROTAGONISTAS = List.of("juanca", "sofia", "mateo");
    static final List<String> CAST = List.of(
            "valen", "cami", "nico", "lucas", "martina", "thiago", "agus", "flor");

    // username -> filas [numeroBase, cantidad]. Repes (x2) reservadas por actividad:
    //  - juanca (Argentina 1..15): publica 1,2 · comercia/subasta/oferta 3,4,5,7,9
    //  - sofia  (10..24):          publica 19,20 · comercia/subasta/oferta 16,17,18,21,22
    //  - mateo  (22..36):          publica 28,29,30 · comercia/subasta/oferta 25,26,27,31
    //  - reparto: una repe (x2) que a algún protagonista le falta (alimenta sugerencias US4).
    private static final Map<String, int[][]> MATRIZ = Map.ofEntries(
        Map.entry("juanca", new int[][]{ {1,2},{2,2},{3,2},{4,2},{5,2},{6,1},{7,2},{8,1},{9,2},
                                         {10,1},{11,1},{12,1},{13,1},{14,1},{15,1} }),
        Map.entry("sofia",  new int[][]{ {10,1},{11,1},{12,1},{13,1},{14,1},{15,1},
                                         {16,2},{17,2},{18,2},{19,2},{20,2},{21,1},{22,1},{23,1},{24,1} }),
        Map.entry("mateo",  new int[][]{ {22,1},{23,1},{24,1},{25,2},{26,2},{27,2},{28,2},{29,2},{30,2},
                                         {31,1},{32,1},{33,1},{34,1},{35,1},{36,1} }),
        Map.entry("valen",   new int[][]{ {40,2},{58,1},{59,1} }),
        Map.entry("cami",    new int[][]{ {37,2},{38,1},{39,1} }),
        Map.entry("nico",    new int[][]{ {42,2},{43,1},{44,1} }),
        Map.entry("lucas",   new int[][]{ {45,2},{46,1},{47,1} }),
        Map.entry("martina", new int[][]{ {48,2},{49,1},{50,1} }),
        Map.entry("thiago",  new int[][]{ {51,2},{52,1},{53,1} }),
        Map.entry("agus",    new int[][]{ {54,2},{55,1},{56,1} }),
        Map.entry("flor",    new int[][]{ {57,2},{60,1},{1,1} })
    );
```

- [ ] **Step 2: Reescribir `seedUsuarios()`**

Reemplazar el método `seedUsuarios()` por:

```java
    /**
     * Crea admin + 3 protagonistas + 8 de reparto.
     * @return mapa username -> Usuario persistido.
     */
    Map<String, Usuario> seedUsuarios() {
        Map<String, Usuario> users = new LinkedHashMap<>();
        users.put("admin", usuarioService.crear(buildUser("admin", PASS_ADMIN, Role.ADMIN)));
        for (String name : PROTAGONISTAS) {
            users.put(name, usuarioService.crear(buildUser(name, PASS_DEMO, Role.USER)));
        }
        for (String name : CAST) {
            users.put(name, usuarioService.crear(buildUser(name, PASS_DEMO, Role.USER)));
        }
        return users;
    }
```

- [ ] **Step 3: Reescribir `seedColecciones()` para devolver `InstancePool`**

Reemplazar el método `seedColecciones(...)` completo por:

```java
    /**
     * Crea las instancias de figurita de cada usuario según MATRIZ y las carga en un
     * InstancePool (para asignarlas a actividades sin doble uso).
     */
    InstancePool seedColecciones(Map<String, Usuario> users, Map<Integer, FiguritaBase> bases) {
        InstancePool pool = new InstancePool();
        for (Map.Entry<String, int[][]> e : MATRIZ.entrySet()) {
            Usuario u = users.get(e.getKey());
            for (int[] fila : e.getValue()) {
                int numero = fila[0], cantidad = fila[1];
                FiguritaBase base = bases.get(numero);
                for (int i = 0; i < cantidad; i++) {
                    Figurita f = figuritaService.crear(
                            Figurita.builder().figuritaBase(base).owner(u).build());
                    pool.add(e.getKey(), numero, f);
                }
            }
        }
        return pool;
    }
```

- [ ] **Step 4: Agregar `seedPublicaciones(...)` y el helper `publicar(...)`**

Agregar estos dos métodos (nuevos) a `DemoSeedService`:

```java
    /** D-6: cada protagonista publica repetidas (US1). mateo publica una más el D-3. */
    void seedPublicaciones(DemoTimeline timeline, Map<String, Usuario> users,
                           Map<Integer, FiguritaBase> bases) {
        LocalDateTime d6 = timeline.dia(-6, 10);
        publicar(users.get("juanca"), bases.get(1), 1, d6);
        publicar(users.get("juanca"), bases.get(2), 1, d6);
        publicar(users.get("sofia"),  bases.get(19), 1, d6);
        publicar(users.get("sofia"),  bases.get(20), 1, d6);
        publicar(users.get("mateo"),  bases.get(28), 1, d6);
        publicar(users.get("mateo"),  bases.get(29), 1, d6);
        publicar(users.get("mateo"),  bases.get(30), 1, timeline.dia(-3, 15));
    }

    /** Publica `cantidad` figuritas de `base` del usuario (reusa el service) y backdatea la fecha. */
    private void publicar(Usuario u, FiguritaBase base, int cantidad, LocalDateTime cuando) {
        FiguritaPublicadaRequestDTO dto = new FiguritaPublicadaRequestDTO();
        dto.setUsuarioId(u.getId());
        dto.setFiguritaBaseId(base.getId());
        dto.setCantidad(cantidad);
        FiguritaPublicadaResponseDTO res = figuritaPublicadaService.publicar(dto);
        figuritaPublicadaRepo.findById(res.getId()).ifPresent(p -> {
            p.setFechaPublicacion(cuando);
            figuritaPublicadaRepo.save(p);
        });
    }
```

Agregar los imports necesarios al inicio del archivo:

```java
import com.grupo3.tp.dtos.FiguritaPublicadaRequestDTO;
import com.grupo3.tp.dtos.FiguritaPublicadaResponseDTO;
import com.grupo3.tp.dtos.ProtagonistaDTO;
```

- [ ] **Step 5: Reescribir `seedPropuestas(...)` con la línea de tiempo**

Reemplazar el método `seedPropuestas(...)` completo por (usa `pool.tomar` + `timeline.enDia`; `crearSolicitud(...)` se reusa sin cambios):

```java
    /** Propuestas repartidas: D-5 se crean, D-4 se acepta/rechaza, D-1 acepta + deja pendientes. */
    void seedPropuestas(DemoTimeline timeline, Map<String, Usuario> users, InstancePool pool) {
        Usuario juanca = users.get("juanca"), sofia = users.get("sofia"), mateo = users.get("mateo");
        SolicitudDeIntercambio[] hold = new SolicitudDeIntercambio[2];

        // D-5: se crean las propuestas (notifica al destinatario)
        timeline.enDia(timeline.dia(-5, 11), () -> {
            // mateo pide la base 3 de juanca, ofrece su 25
            hold[0] = crearSolicitud(mateo, pool.tomar("juanca", 3),
                    List.of(pool.tomar("mateo", 25)));
            // valen pide la base 17 de sofia, ofrece su 40
            hold[1] = crearSolicitud(users.get("valen"), pool.tomar("sofia", 17),
                    List.of(pool.tomar("valen", 40)));
            // sofia pide la base 31 de mateo, ofrece su 22 (queda PENDIENTE)
            crearSolicitud(sofia, pool.tomar("mateo", 31), List.of(pool.tomar("sofia", 22)));
        });

        // D-4: juanca acepta a mateo (transfer + Intercambio + notif); sofia rechaza a valen
        timeline.enDia(timeline.dia(-4, 9), () -> {
            solicitudService.aceptar(hold[0].getId());
            solicitudService.rechazar(hold[1].getId());
        });

        // D-1: juanca propone a sofia y sofia acepta; quedan 2 propuestas PENDIENTES accionables al D0
        timeline.enDia(timeline.dia(-1, 18), () -> {
            SolicitudDeIntercambio juancaASofia = crearSolicitud(juanca, pool.tomar("sofia", 16),
                    List.of(pool.tomar("juanca", 5)));
            solicitudService.aceptar(juancaASofia.getId());
            // cami pide la base 6 de juanca (RECIBIDA por juanca, pendiente)
            crearSolicitud(users.get("cami"), pool.tomar("juanca", 6),
                    List.of(pool.tomar("cami", 37)));
            // juanca pide la base 48 de martina (ENVIADA por juanca, pendiente)
            crearSolicitud(juanca, pool.tomar("martina", 48), List.of(pool.tomar("juanca", 9)));
        });
    }
```

- [ ] **Step 6: Reescribir `seedSubastas(...)` y el helper de creación**

Reemplazar `crearSubastaEnCurso(...)` por `crearSubasta(...)` (times/estado explícitos) y reescribir `seedSubastas(...)`. El helper `ofertar(...)` se reusa sin cambios.

Reemplazar el método `crearSubastaEnCurso(...)` por:

```java
    /** Crea una subasta con horaInicio/horaFin/estado explícitos (para poder ubicarla en la semana). */
    private Subasta crearSubasta(Usuario dueno, Figurita figurita, List<CondicionImpl> condiciones,
                                 LocalDateTime inicio, LocalDateTime fin, EstadoSubasta estado) {
        SubastaDTO dto = new SubastaDTO();
        dto.setUsuarioId(dueno.getId());
        dto.setFiguritaId(figurita.getId());
        dto.setDuracion((int) java.time.Duration.between(inicio, fin).toHours());
        dto.setCondiciones(condiciones);
        Subasta s = subastaService.crear(dto);
        s.setEstado(estado);
        s.setHoraInicio(inicio);
        s.setHoraFin(fin);
        return subastaService.actualizar(s.getId(), s).orElse(s);
    }
```

Reemplazar el método `seedSubastas(...)` por:

```java
    /** D-3: abren subastas (una con condición Argentina) + una FINALIZADA de variedad. D-2: ofertas. */
    void seedSubastas(DemoTimeline timeline, Map<String, Usuario> users, InstancePool pool) {
        Usuario juanca = users.get("juanca"), sofia = users.get("sofia"), mateo = users.get("mateo");
        LocalDateTime abren = timeline.dia(-3, 12);

        // Subasta de juanca (base 4), cierra D+1
        Subasta subJuanca = crearSubasta(juanca, pool.tomar("juanca", 4), List.of(),
                abren, timeline.dia(1, 12), EstadoSubasta.EN_CURSO);

        // Subasta de sofia (base 18) CON condición "Solo Argentina", cierra D+2
        CondicionImpl condArg = CondicionImpl.builder()
                .nombre("Solo Argentina")
                .descripcion("La oferta debe incluir una figurita de Argentina")
                .filtros(List.of(Filtro.builder().tipo("seleccion").valor("Argentina").build()))
                .build();
        Subasta subSofia = crearSubasta(sofia, pool.tomar("sofia", 18), List.of(condArg),
                abren, timeline.dia(2, 12), EstadoSubasta.EN_CURSO);

        // Subasta de mateo (base 27), cierra D+3
        Subasta subMateo = crearSubasta(mateo, pool.tomar("mateo", 27), List.of(),
                abren, timeline.dia(3, 12), EstadoSubasta.EN_CURSO);

        // Subasta ya FINALIZADA (variedad en el historial): thiago, base 51, sin ofertas
        crearSubasta(users.get("thiago"), pool.tomar("thiago", 51), List.of(),
                timeline.dia(-6, 12), timeline.dia(-3, 12), EstadoSubasta.FINALIZADA);

        // D-2: llegan las ofertas (fechaOferta backdated por enDia)
        timeline.enDia(timeline.dia(-2, 16), () -> {
            // juanca oferta en la de sofia con su base 7 (Argentina → cumple la condición)
            ofertar(subSofia, juanca, List.of(pool.tomar("juanca", 7)));
            // ofertas en la de juanca: mateo(26), sofia(21), nico(42)
            ofertar(subJuanca, mateo, List.of(pool.tomar("mateo", 26)));
            ofertar(subJuanca, sofia, List.of(pool.tomar("sofia", 21)));
            ofertar(subJuanca, users.get("nico"), List.of(pool.tomar("nico", 42)));
            // oferta en la de mateo: lucas(45)
            ofertar(subMateo, users.get("lucas"), List.of(pool.tomar("lucas", 45)));
        });
    }
```

- [ ] **Step 7: Reescribir `seed()`**

Reemplazar el método `seed()` por:

```java
    /**
     * Reset total + siembra de la cohorte de demo (3 protagonistas, 1 semana de uso).
     * Orden importante: las transferencias de ownership (aceptar propuestas) ocurren antes de
     * regenerar sugerencias.
     */
    public DemoSeedResultDTO seed() {
        reset();
        catalogoService.cargarDesdeJson();
        Map<Integer, FiguritaBase> bases = primerasBasesPorNumero(60);
        Map<String, Usuario> users = seedUsuarios();
        InstancePool pool = seedColecciones(users, bases);
        DemoTimeline timeline = new DemoTimeline(notificacionRepo, intercambioRepo, ofertaRepo);

        seedPublicaciones(timeline, users, bases);
        seedPropuestas(timeline, users, pool);
        seedSubastas(timeline, users, pool);
        seedCalificaciones();
        sugerenciaService.regenerarTodas();

        List<ProtagonistaDTO> protagonistas = PROTAGONISTAS.stream()
                .map(u -> new ProtagonistaDTO(u, PASS_DEMO))
                .toList();

        return DemoSeedResultDTO.builder()
                .usuarios((int) usuarioRepo.count())
                .figuritasBase((int) figuritaBaseRepo.count())
                .figuritas((int) figuritaRepo.count())
                .figuritasPublicadas((int) figuritaPublicadaRepo.count())
                .solicitudes((int) solicitudRepo.count())
                .intercambios((int) intercambioRepo.count())
                .subastas((int) subastaRepo.count())
                .ofertas((int) ofertaRepo.count())
                .sugerencias((int) sugerenciaRepo.count())
                .notificaciones((int) notificacionRepo.count())
                .calificaciones((int) calificacionRepo.count())
                .protagonistas(protagonistas)
                .protagonistaUsername("juanca").protagonistaPassword(PASS_DEMO)
                .adminUsername("admin").adminPassword(PASS_ADMIN)
                .mensaje("Base reseteada. Cohorte de demo (1 semana de uso) lista. "
                       + "Logueate como juanca, sofia o mateo (pass demo1234).")
                .build();
    }
```

- [ ] **Step 8: Compilar y correr toda la suite**

Run: `cd backend && ./mvnw test`
Expected: BUILD SUCCESS. Los tests que tocan Mongo local (`OfertaServiceTest`) requieren Mongo corriendo; si no está, correr `./mvnw test -Dtest='DemoTimelineTest,InstancePoolTest,DemoSeedServiceTest'` y esperar PASS (8 tests). El resto de la suite (90 tests) debe seguir verde donde ya corría.

- [ ] **Step 9: Commit** (solo si el usuario lo pide)

```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java
git commit -m "feat(demo-seed): 3 protagonistas con actividad repartida en la semana (US1-US12)"
```

---

### Task 6: Auto-seed idempotente al levantar el docker

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/service/DemoSeedBootstrap.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/DemoSeedBootstrapTest.java`
- Modify: `backend/src/main/resources/application.properties`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`

**Interfaces:**
- Consumes: `UsuarioRepository.count()`, `DemoSeedService.seed()` (Task 5), `DemoSeedResultDTO` (Task 3).
- Produces: `DemoSeedBootstrap` con método package-visible `boolean seedSiVacio()` y handler `@EventListener(ApplicationReadyEvent.class)`.

- [ ] **Step 1: Write the failing test**

```java
// backend/src/test/java/com/grupo3/tp/service/DemoSeedBootstrapTest.java
package com.grupo3.tp.service;

import com.grupo3.tp.dtos.DemoSeedResultDTO;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DemoSeedBootstrapTest {

    @Mock UsuarioRepository usuarioRepo;
    @Mock DemoSeedService demoSeedService;
    @InjectMocks DemoSeedBootstrap bootstrap;

    @Test
    void seedaCuandoLaBaseEstaVacia() {
        when(usuarioRepo.count()).thenReturn(0L);
        when(demoSeedService.seed()).thenReturn(DemoSeedResultDTO.builder().usuarios(12).build());

        assertTrue(bootstrap.seedSiVacio());
        verify(demoSeedService).seed();
    }

    @Test
    void noSeedaCuandoLaBaseTieneDatos() {
        when(usuarioRepo.count()).thenReturn(5L);

        assertFalse(bootstrap.seedSiVacio());
        verify(demoSeedService, never()).seed();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedBootstrapTest`
Expected: FAIL ("cannot find symbol: class DemoSeedBootstrap").

- [ ] **Step 3: Write minimal implementation**

```java
// backend/src/main/java/com/grupo3/tp/service/DemoSeedBootstrap.java
package com.grupo3.tp.service;

import com.grupo3.tp.dtos.DemoSeedResultDTO;
import com.grupo3.tp.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Auto-seed idempotente al arrancar: si la base está vacía, siembra la cohorte de demo
 * (catálogo de figuritas incluido). Se activa solo con demo.seed-on-startup=true
 * (env SEED_ON_STARTUP); apagado en prod y en tests. Nunca wipea data existente.
 */
@Component
@ConditionalOnProperty(name = "demo.seed-on-startup", havingValue = "true")
public class DemoSeedBootstrap {

    private static final Logger log = LoggerFactory.getLogger(DemoSeedBootstrap.class);

    private final UsuarioRepository usuarioRepo;
    private final DemoSeedService demoSeedService;

    public DemoSeedBootstrap(UsuarioRepository usuarioRepo, DemoSeedService demoSeedService) {
        this.usuarioRepo = usuarioRepo;
        this.demoSeedService = demoSeedService;
    }

    /** Se dispara cuando la app está lista (Mongo ya conectado). */
    @EventListener(ApplicationReadyEvent.class)
    public void alArrancar() {
        seedSiVacio();
    }

    /** Siembra solo si no hay usuarios (idempotente). @return true si sembró. */
    boolean seedSiVacio() {
        long usuarios = usuarioRepo.count();
        if (usuarios > 0) {
            log.info("Auto-seed omitido: la base ya tiene {} usuario(s).", usuarios);
            return false;
        }
        log.info("Auto-seed: base vacía, sembrando cohorte de demo...");
        DemoSeedResultDTO r = demoSeedService.seed();
        log.info("Auto-seed completo: {} usuarios, {} figuritas, {} publicaciones, {} subastas.",
                r.getUsuarios(), r.getFiguritas(), r.getFiguritasPublicadas(), r.getSubastas());
        return true;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedBootstrapTest`
Expected: PASS (2 tests).

- [ ] **Step 5: Bind la property en `application.properties`**

En `backend/src/main/resources/application.properties`, agregar al final:

```properties

# --- Demo seed ---
# Auto-seed idempotente al arrancar (solo si la base está vacía). Se prende via env
# SEED_ON_STARTUP=true (compose local); apagado por defecto (prod/tests).
demo.seed-on-startup=${SEED_ON_STARTUP:false}
```

- [ ] **Step 6: Prender el flag en el compose base (dev local)**

En `docker-compose.yml`, en el servicio `backend`, agregar la línea al bloque `environment` (después de `- JWT_SECRET=${JWT_SECRET}`):

```yaml
      # Auto-seed idempotente al levantar local (solo si la base está vacía). Apagado en prod.
      - SEED_ON_STARTUP=${SEED_ON_STARTUP:-true}
```

- [ ] **Step 7: Apagar el flag en el override de prod (barrera dura)**

En `docker-compose.prod.yml`, agregar un bloque `backend` al mapa `services:` (queda junto al `frontend` existente):

```yaml
  backend:
    # ⚠️ Prod usa el Mongo del contenedor y hereda el compose base: apagar el auto-seed
    # explícitamente para no sembrar/pisar datos de producción.
    environment:
      - SEED_ON_STARTUP=false
```

- [ ] **Step 8: Verificar build y suite de mecanismos**

Run: `cd backend && ./mvnw test -Dtest='DemoTimelineTest,InstancePoolTest,DemoSeedServiceTest,DemoSeedBootstrapTest'`
Expected: PASS (10 tests). El bean `DemoSeedBootstrap` no se instancia en tests (property apagada), así que no requiere Mongo.

- [ ] **Step 9: Commit** (solo si el usuario lo pide)

```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedBootstrap.java backend/src/test/java/com/grupo3/tp/service/DemoSeedBootstrapTest.java backend/src/main/resources/application.properties docker-compose.yml docker-compose.prod.yml
git commit -m "feat(demo-seed): auto-seed idempotente al levantar docker local (off en prod)"
```

---

### Task 7: Verificación end-to-end manual

**Files:** ninguno (verificación de comportamiento).

Como el repo no tiene harness de integración, el `seed()` completo se valida corriendo la app. Requiere Docker (el compose trae Mongo self-contained).

- [ ] **Step 1: Levantar la app sobre un volumen fresco (dispara el auto-seed)**

Run: `cp .env.example .env` (si no existe); `docker compose down -v` (garantiza Mongo vacío); `docker compose up --build -d`
Expected: contenedores `mongo`, `backend`, `frontend` arriba. En `docker compose logs backend` debe aparecer `Auto-seed: base vacía, sembrando cohorte de demo...` seguido de `Auto-seed completo: 12 usuarios, ... publicaciones, 4 subastas.` sin stacktraces. Si aparece `IllegalStateException "Sin instancias libres..."`, hay un desajuste de cantidades en la MATRIZ: subir la `cantidad` de esa base para ese usuario (Task 5 Step 1), rebuild y re-levantar.

- [ ] **Step 2: Confirmar el resumen del seed y la idempotencia**

Loguear como admin y releer el estado (el auto-seed ya corrió; NO hace falta disparar el seed a mano):

```bash
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"adminpass123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s localhost:8080/admin/stats -H "Authorization: Bearer $TOKEN"
```

Expected: stats con `totalUsers: 12` y subastas/ofertas coherentes. Luego probar la **idempotencia**: `docker compose restart backend` y confirmar en los logs `Auto-seed omitido: la base ya tiene 12 usuario(s).` (no re-siembra). Para re-sembrar a mano queda `POST /admin/seed-demo` con el `$TOKEN`.

- [ ] **Step 3: Verificar la semana y la cobertura por protagonista**

Loguear como `juanca`, `sofia` y `mateo` (pass `demo1234`) en `http://localhost` y confirmar, para cada uno:
- Dashboard con figuritas propias, publicaciones, propuestas enviadas/recibidas (≥1 pendiente accionable), subasta propia activa, oferta emitida.
- Notificaciones repartidas en varios días de la última semana (no todas "hoy").
- Perfil con reputación (estrellas) > 0.
- Sugerencias (US4) con al menos una contraparte.
- Página **Buscar** muestra publicaciones de los 3 protagonistas (no publicaciones colgadas).

Verificar no-doble-uso (opcional, vía Mongo): ninguna figurita id aparece a la vez en una `figuritas_publicadas` DISPONIBLE y en una `subastas` EN_CURSO / `solicitudes_intercambio` PENDIENTE.

- [ ] **Step 4: Bajar la app**

Run: `docker compose down`

---

## Self-Review

**1. Spec coverage:**
- §4 Cohorte → Task 5 Step 1-2 (PROTAGONISTAS/CAST/MATRIZ, seedUsuarios). ✅
- §5 Timeline sin tocar modelos → Task 1 (DemoTimeline). ✅
- §6 Ownership/matriz + pool → Task 5 Step 1,3 + Task 2 (InstancePool). ✅
- §7 Narrativa 7 días + FINALIZADA → Task 5 Steps 4-6. ✅
- §8 Gaps (reset + FiguritaPublicada + DTO) → Task 3 + Task 4 + Task 5 Step 4,7. ✅
- §9 Arquitectura (mecanismos extraídos, escenas en el service) → Tasks 1,2,5. ✅ (refinamiento respecto del spec: `DemoCohorte` no se extrae como clase; cohorte/escenas quedan en `DemoSeedService` — dentro de la flexibilidad que el spec dejó explícita.)
- §10 Testing → Tasks 1,2 (unit) + Task 4 (reset) + Task 6 (bootstrap unit) + Task 7 (manual). ✅ (los asserts de integración del §10 se cubren manualmente por falta de harness — coherente con Global Constraints.)
- §12 Auto-seed idempotente + guard de prod → Task 6 (DemoSeedBootstrap + property + compose base/prod). ✅
- §13 Criterios de aceptación → Task 7 Steps 2-3 (incl. #6 idempotencia). ✅

**2. Placeholder scan:** sin TBD/TODO; todo el código está completo. Los números de la MATRIZ son concretos; el único ajuste previsto (subir cantidades ante `IllegalStateException`) está descripto con procedimiento exacto en Task 6 Step 2. ✅

**3. Type consistency:** `DemoTimeline(NotificacionRepository, IntercambioRepository, OfertaRepository)`, `dia(int,int)`, `enDia(LocalDateTime, Runnable)`; `InstancePool.add(String,int,Figurita)` / `tomar(String,int)` / `disponibles(String,int)`; `ProtagonistaDTO(String,String)`; `seedColecciones(...)` ahora devuelve `InstancePool`; `crearSubasta(...)` reemplaza `crearSubastaEnCurso(...)`. Firmas usadas en Task 5 coinciden con las definidas en Tasks 1-3. `DemoSeedBootstrap(UsuarioRepository, DemoSeedService)` / `seedSiVacio()` (Task 6) consume `DemoSeedService.seed()` (Task 5) y `DemoSeedResultDTO.getFiguritasPublicadas()` (Task 3). ✅
