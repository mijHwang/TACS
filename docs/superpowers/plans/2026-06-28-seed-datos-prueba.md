# Seed de datos de prueba (reset + cohorte demo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botón en la pantalla Admin que resetea toda la base y carga una cohorte de prueba determinística (~12 usuarios) que enciende todas las pantallas, vía un endpoint admin server-side.

**Architecture:** Backend nuevo `DemoSeedService` (orquesta reset por `MongoTemplate` + siembra reutilizando los services del dominio, para que se disparen notificaciones/intercambios solos) expuesto por `POST /api/admin/seed-demo` (ya `@PreAuthorize ADMIN`). Frontend: tarjeta + modal en `/admin` con confirmación tipeada `RESET`.

**Tech Stack:** Java 21, Spring Boot 4, Spring Data MongoDB (`MongoTemplate`), Lombok, JUnit5 + Mockito 5.2 (tests backend). React 19 + TypeScript, Vitest 4 + @testing-library/react (tests frontend).

**Spec:** `docs/superpowers/specs/2026-06-28-seed-datos-prueba-design.md`

## Global Constraints

- **No commitear/pushear sin pedido explícito del usuario** (preferencia vigente). Cada task termina en un *Checkpoint* (build/tests en verde); el `git commit` se ejecuta SOLO si el usuario lo pide. Los comandos de commit van documentados pero no se corren automáticamente.
- **Métodos no triviales con Javadoc** (NFR del TP).
- **Contraseñas hasheadas** con `PasswordEncoder` antes de persistir (NUNCA texto plano). `UsuarioService.crear` NO hashea.
- **Nombres de métodos de service en español** (consistencia con el código: `crear`, `obtenerPorId`, etc.).
- **Backend test pattern:** `@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks`, `verify(...)`. Mockito 5.2.
- **Frontend test pattern:** vitest `globals:true`, `render/screen/fireEvent` de `@testing-library/react`, `vi.fn()`. NO usar jest-dom matchers (`.toBeDisabled()`) ni `@testing-library/user-event` (no están configurados); usar `.disabled` boolean y `fireEvent.change`.
- **Colección de catálogo:** se reutiliza el `FiguritaBaseSeeder` comentado → 48 `figuritas_base` numeradas 1..48 (Argentina 1..24, Brasil 25..48).
- **Endpoint single-action:** `POST /api/admin/seed-demo` SIEMPRE resetea + siembra (no toma parámetros). El front lo llama sin body.
- **Credenciales sembradas:** `admin`/`adminpass123` (ADMIN); `juanca`/`demo1234` (protagonista) y 10 contrapartes con `demo1234`.

---

## Mapa de archivos

**Backend (crear):**
- `backend/src/main/java/com/grupo3/tp/dtos/DemoSeedResultDTO.java` — resumen de counts + credenciales.
- `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java` — orquestador del reset + siembra.
- `backend/src/test/java/com/grupo3/tp/service/DemoSeedServiceTest.java` — tests Mockito de `reset()` y `buildUser()`.

**Backend (modificar):**
- `backend/src/main/java/com/grupo3/tp/controller/AdminController.java` — agregar `POST /seed-demo`.

**Frontend (crear):**
- `frontend/src/pages/admin/components/SeedDemoCard.tsx` — tarjeta + modal con gating `RESET`.
- `frontend/src/pages/admin/components/SeedDemoCard.test.tsx` — test de gating.
- `frontend/src/services/adminService.test.ts` — test de `seedDemo()`.

**Frontend (modificar):**
- `frontend/src/services/adminService.ts` — agregar `seedDemo()` + tipo `SeedResult`.
- `frontend/src/pages/admin/AdminPage.tsx` — renderizar `<SeedDemoCard onDone={refetchStats} />`.

---

### Task 1: DTO de resultado + esqueleto de `DemoSeedService` con `reset()` y `buildUser()`

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/dtos/DemoSeedResultDTO.java`
- Create: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/DemoSeedServiceTest.java`

**Interfaces:**
- Produces:
  - `DemoSeedResultDTO` (Lombok `@Data @AllArgsConstructor @NoArgsConstructor @Builder`) con campos `int usuarios, figuritasBase, figuritas, solicitudes, intercambios, subastas, ofertas, sugerencias, notificaciones, calificaciones; String protagonistaUsername, protagonistaPassword, adminUsername, adminPassword, mensaje;`
  - `DemoSeedService.reset()` → `void` (dropea las 15 colecciones).
  - `DemoSeedService.buildUser(String username, String rawPassword, Role role)` → `Usuario` (password encodeada, rol seteado). Visibilidad **package-private** para test.
  - Constante `static final String[] COLECCIONES` con las 15 colecciones.

- [ ] **Step 1: Crear el DTO**

`backend/src/main/java/com/grupo3/tp/dtos/DemoSeedResultDTO.java`:
```java
package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Resumen devuelto por el seed de demo (US8/visualización). Datos de display, no de negocio. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DemoSeedResultDTO {
    private int usuarios;
    private int figuritasBase;
    private int figuritas;
    private int solicitudes;
    private int intercambios;
    private int subastas;
    private int ofertas;
    private int sugerencias;
    private int notificaciones;
    private int calificaciones;
    private String protagonistaUsername;
    private String protagonistaPassword;
    private String adminUsername;
    private String adminPassword;
    private String mensaje;
}
```

- [ ] **Step 2: Escribir el test fallido**

`backend/src/test/java/com/grupo3/tp/service/DemoSeedServiceTest.java`:
```java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Role;
import com.grupo3.tp.models.Usuario;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DemoSeedServiceTest {

    @Mock MongoTemplate mongoTemplate;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks DemoSeedService service;

    @Test
    void resetDropeaLas15Colecciones() {
        service.reset();
        for (String c : DemoSeedService.COLECCIONES) {
            verify(mongoTemplate).dropCollection(c);
        }
        assertEquals(15, DemoSeedService.COLECCIONES.length);
    }

    @Test
    void buildUserEncodeaPasswordYSeteaRol() {
        when(passwordEncoder.encode("demo1234")).thenReturn("HASH");
        Usuario u = service.buildUser("juanca", "demo1234", Role.USER);
        assertEquals("juanca", u.getUsername());
        assertEquals("HASH", u.getPassword());
        assertEquals(Role.USER, u.getRole());
        verify(passwordEncoder).encode("demo1234");
    }
}
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedServiceTest`
Expected: FAIL de compilación ("cannot find symbol DemoSeedService").

- [ ] **Step 4: Crear el esqueleto de `DemoSeedService`**

`backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java` (solo lo necesario para esta task; las demás siembras se agregan en tasks siguientes):
```java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Role;
import com.grupo3.tp.models.Usuario;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Orquestador del reset + siembra de datos de demo (visualización/pruebas).
 * Código de demo, no de negocio: reusa los services del dominio para que los
 * efectos colaterales (notificaciones, intercambios) ocurran como en uso real.
 */
@Service
public class DemoSeedService {

    /** Las 15 colecciones de la app, a vaciar en el reset. */
    public static final String[] COLECCIONES = {
        "usuarios", "figuritas", "figuritas_base", "categorias_figurita", "condiciones",
        "equipos", "jugadores", "selecciones", "intercambios", "notificaciones",
        "ofertas", "solicitudes_intercambio", "subastas", "sugerencias", "calificaciones"
    };

    private final MongoTemplate mongoTemplate;
    private final PasswordEncoder passwordEncoder;

    public DemoSeedService(MongoTemplate mongoTemplate, PasswordEncoder passwordEncoder) {
        this.mongoTemplate = mongoTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    /** Vacía todas las colecciones de la app (reset total). */
    public void reset() {
        for (String c : COLECCIONES) {
            mongoTemplate.dropCollection(c);
        }
    }

    /** Construye un Usuario con password hasheada y rol explícito (no persiste). */
    Usuario buildUser(String username, String rawPassword, Role role) {
        return Usuario.builder()
                .username(username)
                .password(passwordEncoder.encode(rawPassword))
                .email(username + "@demo.test")
                .role(role)
                .build();
    }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedServiceTest`
Expected: PASS (2 tests).

- [ ] **Step 6: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add backend/src/main/java/com/grupo3/tp/dtos/DemoSeedResultDTO.java \
        backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java \
        backend/src/test/java/com/grupo3/tp/service/DemoSeedServiceTest.java
git commit -m "feat(seed): DemoSeedService skeleton con reset() y buildUser()"
```

---

### Task 2: Sembrar el catálogo (`seedCatalogo`)

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`

**Interfaces:**
- Consumes: repos de catálogo (constructor).
- Produces: `Map<Integer, FiguritaBase> seedCatalogo()` → bases indexadas por `numero` (1..48). También deja persistidas selecciones/categorías/equipos/jugadores.

- [ ] **Step 1: Agregar dependencias de catálogo al constructor**

Inyectar en `DemoSeedService` (agregar campos + parámetros al constructor existente):
```java
import com.grupo3.tp.repository.*;
import com.grupo3.tp.models.*;
import java.util.*;

// campos nuevos:
private final SeleccionRepository seleccionRepo;
private final EquipoRepository equipoRepo;
private final JugadorRepository jugadorRepo;
private final CategoriaFiguritaRepository categoriaRepo;
private final FiguritaBaseRepository figuritaBaseRepo;
```
Agregarlos como parámetros del constructor y asignarlos (mantener `mongoTemplate`, `passwordEncoder`).

- [ ] **Step 2: Implementar `seedCatalogo()` reutilizando el seeder comentado**

Portar el cuerpo del seeder comentado `backend/src/main/java/com/grupo3/tp/configs/FiguritaBaseSeeder.java` (líneas 34–237: las 2 selecciones, 3 categorías, 17 equipos, 16 jugadores y los 48 `FiguritaBase`) dentro de este método, con una sola adaptación: **capturar cada `FiguritaBase` guardada en un `Map<Integer,FiguritaBase>` por `numero` y devolverlo**.

```java
/**
 * Crea el catálogo base (selecciones, categorías, equipos, jugadores y 48 figuritas_base
 * numeradas 1..48). Reutiliza los datos del antiguo FiguritaBaseSeeder.
 * @return mapa numero -> FiguritaBase para usar al armar colecciones.
 */
Map<Integer, FiguritaBase> seedCatalogo() {
    Map<Integer, FiguritaBase> porNumero = new HashMap<>();

    // ---- PEGAR AQUÍ el cuerpo de FiguritaBaseSeeder.run() (líneas 35..235) ----
    // (selecciones arg/bra, categorías oro/plata/bronce, equipos, jugadores)
    // Reemplazar CADA bloque:
    //     figRepository.save(FiguritaBase.builder().numero(numero++)....build());
    // por:
    //     FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder().numero(numero).<...>.build());
    //     porNumero.put(numero, fb);
    //     numero++;
    // y usar selRepository->seleccionRepo, equipoRepository->equipoRepo,
    //     catRepository->categoriaRepo, jugRepository->jugadorRepo.
    // -------------------------------------------------------------------------

    return porNumero;
}
```
> Nota: el seeder comentado usa `numero++` inline; al portarlo, separar el incremento (como arriba) para poder hacer `porNumero.put(numero, fb)` antes de incrementar.

- [ ] **Step 3: Verificar compilación**

Run: `cd backend && ./mvnw clean package -DskipTests`
Expected: BUILD SUCCESS. (No hay test unitario nuevo: `seedCatalogo` requiere DB; se valida en la verificación manual de la Task 10.)

- [ ] **Step 4: Correr los tests existentes para no romper nada**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedServiceTest`
Expected: PASS (siguen pasando los 2).

- [ ] **Step 5: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java
git commit -m "feat(seed): catálogo (48 figuritas_base) reutilizando el seeder"
```

---

### Task 3: Sembrar usuarios (`seedUsuarios`)

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`

**Interfaces:**
- Consumes: `buildUser(...)` (Task 1), `UsuarioService.crear(Usuario)`.
- Produces: `Map<String, Usuario> seedUsuarios()` → usuarios por username (con id asignado por Mongo). Constantes `PASS_DEMO="demo1234"`, `PASS_ADMIN="adminpass123"`, `PROTAGONISTA="juanca"`, `List<String> CONTRAPARTES`.

- [ ] **Step 1: Inyectar `UsuarioService`**

Agregar al constructor: `private final UsuarioService usuarioService;`

- [ ] **Step 2: Implementar `seedUsuarios()`**
```java
static final String PASS_DEMO  = "demo1234";
static final String PASS_ADMIN = "adminpass123";
static final String PROTAGONISTA = "juanca";
static final List<String> CONTRAPARTES = List.of(
        "sofia", "mateo", "valen", "cami", "nico",
        "lucas", "martina", "thiago", "agus", "flor");

/** Crea admin + protagonista + 10 contrapartes. @return mapa username -> Usuario persistido. */
Map<String, Usuario> seedUsuarios() {
    Map<String, Usuario> users = new LinkedHashMap<>();
    users.put("admin", usuarioService.crear(buildUser("admin", PASS_ADMIN, Role.ADMIN)));
    users.put(PROTAGONISTA, usuarioService.crear(buildUser(PROTAGONISTA, PASS_DEMO, Role.USER)));
    for (String name : CONTRAPARTES) {
        users.put(name, usuarioService.crear(buildUser(name, PASS_DEMO, Role.USER)));
    }
    return users;
}
```

- [ ] **Step 3: Verificar compilación**

Run: `cd backend && ./mvnw clean package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java
git commit -m "feat(seed): 12 usuarios (admin + juanca + 10 contrapartes)"
```

---

### Task 4: Sembrar colecciones / matriz (`seedColecciones`)

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`

**Interfaces:**
- Consumes: `FiguritaService.crear(Figurita)`, mapas de Task 2 y 3.
- Produces: `Map<String, Map<Integer, List<Figurita>>> seedColecciones(Map<String,Usuario> users, Map<Integer,FiguritaBase> bases)` → por username, por numero de base, la lista de instancias `Figurita` poseídas (para que propuestas/subastas elijan instancias concretas).

- [ ] **Step 1: Inyectar `FiguritaService`**

Agregar al constructor: `private final FiguritaService figuritaService;`

- [ ] **Step 2: Implementar `seedColecciones()` con la matriz determinística**

```java
// Matriz: username -> filas [numeroBase, cantidad]. Diseñada para:
//  - juanca: posee bases 1..15 (≈31% de 48); repetidas (x2) en 1..6 → publicadas/excedentes.
//  - cada contraparte: tiene x2 de alguna base que a juanca le falta (16..48) y NO posee 1..6
//    → sugerencia bidireccional con juanca.
private static final Map<String, int[][]> MATRIZ = Map.ofEntries(
    Map.entry("juanca", new int[][]{ {1,2},{2,2},{3,2},{4,2},{5,2},{6,2},
                                     {7,1},{8,1},{9,1},{10,1},{11,1},{12,1},{13,1},{14,1},{15,1} }),
    Map.entry("sofia",   new int[][]{ {16,2},{17,1},{18,1},{19,1},{20,1} }),
    Map.entry("mateo",   new int[][]{ {21,2},{22,1},{23,1},{24,1},{7,1},{8,1} }),
    Map.entry("valen",   new int[][]{ {25,2},{26,1},{27,1} }),
    Map.entry("cami",    new int[][]{ {35,2},{36,1},{37,1},{16,1},{17,1} }),
    Map.entry("nico",    new int[][]{ {28,2},{29,1},{30,1},{31,1} }),
    Map.entry("lucas",   new int[][]{ {32,2},{33,1},{34,1} }),
    Map.entry("martina", new int[][]{ {38,2},{39,1},{40,1} }),
    Map.entry("thiago",  new int[][]{ {41,2},{42,1},{43,1} }),
    Map.entry("agus",    new int[][]{ {44,2},{45,1},{46,1} }),
    Map.entry("flor",    new int[][]{ {47,2},{48,1},{1,1} })
);

/** Crea las instancias de figurita de cada usuario según MATRIZ. */
Map<String, Map<Integer, List<Figurita>>> seedColecciones(
        Map<String, Usuario> users, Map<Integer, FiguritaBase> bases) {
    Map<String, Map<Integer, List<Figurita>>> owned = new HashMap<>();
    for (Map.Entry<String, int[][]> e : MATRIZ.entrySet()) {
        Usuario u = users.get(e.getKey());
        Map<Integer, List<Figurita>> porBase = new HashMap<>();
        for (int[] fila : e.getValue()) {
            int numero = fila[0], cantidad = fila[1];
            FiguritaBase base = bases.get(numero);
            List<Figurita> instancias = new ArrayList<>();
            for (int i = 0; i < cantidad; i++) {
                instancias.add(figuritaService.crear(
                        Figurita.builder().figuritaBase(base).owner(u).build()));
            }
            porBase.put(numero, instancias);
        }
        owned.put(e.getKey(), porBase);
    }
    return owned;
}
```

- [ ] **Step 3: Verificar compilación**

Run: `cd backend && ./mvnw clean package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java
git commit -m "feat(seed): colecciones/repetidas/faltantes (matriz determinística)"
```

---

### Task 5: Sembrar propuestas (`seedPropuestas`)

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`

**Interfaces:**
- Consumes: `SolicitudDeIntercambioService.crear(SolicitudDeIntercambio)`, `.aceptar(id)`, `.rechazar(id)`; mapas de owned (Task 4).
- Produces: `void seedPropuestas(Map<String,Usuario> users, Map<String,Map<Integer,List<Figurita>>> owned)`. Genera notificaciones e intercambios como efecto colateral.

- [ ] **Step 1: Inyectar `SolicitudDeIntercambioService`**

Agregar al constructor: `private final SolicitudDeIntercambioService solicitudService;`

- [ ] **Step 2: Implementar `seedPropuestas()`**

```java
/**
 * Helper: construye una solicitud (proponente pide `figuritaPedida`, ofrece `ofrecidas`) y la persiste.
 * Replica lo que hace el controller (estado PENDIENTE + destinatarioUsername) para reusar el
 * efecto colateral de notificación de SolicitudDeIntercambioService.crear().
 */
private SolicitudDeIntercambio crearSolicitud(Usuario proponente, Figurita figuritaPedida,
                                              List<Figurita> ofrecidas) {
    SolicitudDeIntercambio s = SolicitudDeIntercambio.builder()
            .usuario(proponente)
            .figurita(figuritaPedida)
            .figuritasOfrecidas(ofrecidas)
            .estado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE)
            .destinatarioUsername(figuritaPedida.getOwner().getUsername())
            .build();
    return solicitudService.crear(s);
}

/** Crea propuestas recibidas/enviadas por juanca y acepta/rechaza algunas. */
void seedPropuestas(Map<String, Usuario> users,
                    Map<String, Map<Integer, List<Figurita>>> owned) {
    Usuario juanca = users.get("juanca");

    // --- RECIBIDAS por juanca: piden una figurita de juanca (base 2 y base 3, que tiene x2) ---
    // sofia pide la base 2 de juanca, ofrece su base 16
    SolicitudDeIntercambio rSofia = crearSolicitud(
            users.get("sofia"), owned.get("juanca").get(2).get(0),
            List.of(owned.get("sofia").get(16).get(0)));
    // mateo pide la base 3 de juanca, ofrece su base 21
    SolicitudDeIntercambio rMateo = crearSolicitud(
            users.get("mateo"), owned.get("juanca").get(3).get(0),
            List.of(owned.get("mateo").get(21).get(0)));
    // valen pide la base 4 de juanca, ofrece su base 25 (queda PENDIENTE)
    crearSolicitud(users.get("valen"), owned.get("juanca").get(4).get(0),
            List.of(owned.get("valen").get(25).get(0)));

    solicitudService.aceptar(rSofia.getId());   // transfiere + Intercambio + notif a sofia
    solicitudService.rechazar(rMateo.getId());  // notif a mateo

    // --- ENVIADAS por juanca: pide figuritas de nico y lucas, ofrece sus repetidas ---
    // juanca pide la base 28 de nico, ofrece su base 5 (segunda instancia)
    SolicitudDeIntercambio eNico = crearSolicitud(
            juanca, owned.get("nico").get(28).get(0),
            List.of(owned.get("juanca").get(5).get(1)));
    // juanca pide la base 32 de lucas, ofrece su base 6 (segunda instancia) (queda PENDIENTE)
    crearSolicitud(juanca, owned.get("lucas").get(32).get(0),
            List.of(owned.get("juanca").get(6).get(1)));

    solicitudService.aceptar(eNico.getId());    // Intercambio (generador=juanca) + notif a juanca
}
```
> Instancias elegidas para no colisionar: las recibidas aceptadas consumen `juanca[2][0]` y la enviada aceptada ofrece `juanca[5][1]`; ninguna se reusa en otra propuesta pendiente.

- [ ] **Step 3: Verificar compilación**

Run: `cd backend && ./mvnw clean package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java
git commit -m "feat(seed): propuestas recibidas/enviadas + aceptar/rechazar"
```

---

### Task 6: Sembrar subastas y ofertas (`seedSubastas`)

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`

**Interfaces:**
- Consumes: `SubastaService.crear(SubastaDTO)`, `SubastaService.actualizar(id, Subasta)`, `OfertaService.crear(OfertaDTO)`; owned (Task 4).
- Produces: `void seedSubastas(Map<String,Usuario> users, Map<String,Map<Integer,List<Figurita>>> owned)`.

- [ ] **Step 1: Inyectar `SubastaService` y `OfertaService`**

Agregar al constructor: `private final SubastaService subastaService;` y `private final OfertaService ofertaService;`
Imports: `com.grupo3.tp.dtos.SubastaDTO`, `com.grupo3.tp.dtos.OfertaDTO`, `com.grupo3.tp.models.EstadoSubasta`, `java.time.LocalDateTime`.

- [ ] **Step 2: Implementar helpers + `seedSubastas()`**

```java
/** Crea una subasta PENDIENTE y la pone EN_CURSO (replica el endpoint /iniciar). */
private Subasta crearSubastaEnCurso(Usuario dueno, Figurita figurita, int duracionHoras,
                                    List<CondicionImpl> condiciones) {
    SubastaDTO dto = new SubastaDTO();
    dto.setUsuarioId(dueno.getId());
    dto.setFiguritaId(figurita.getId());
    dto.setDuracion(duracionHoras);
    dto.setCondiciones(condiciones);
    Subasta s = subastaService.crear(dto);
    s.setEstado(EstadoSubasta.EN_CURSO);
    s.setHoraInicio(LocalDateTime.now());
    s.setHoraFin(s.getHoraInicio().plusHours(duracionHoras));
    return subastaService.actualizar(s.getId(), s).orElse(s);
}

/** Registra una oferta de `ofertante` en `subasta` con sus figuritas. */
private void ofertar(Subasta subasta, Usuario ofertante, List<Figurita> figuritas) {
    OfertaDTO dto = new OfertaDTO();
    dto.setSubastaId(subasta.getId());
    dto.setUsuarioId(ofertante.getId());
    dto.setFiguritaIds(figuritas.stream().map(Figurita::getId).toList());
    Oferta oferta = ofertaService.crear(dto);
    if (subasta.getOfertas() == null) subasta.setOfertas(new ArrayList<>());
    subasta.getOfertas().add(oferta);
    subastaService.actualizar(subasta.getId(), subasta);
}

/** Crea subastas activas (propias y de contrapartes) con ofertas, incluida una con condiciones. */
void seedSubastas(Map<String, Usuario> users,
                  Map<String, Map<Integer, List<Figurita>>> owned) {
    // Subasta de juanca sobre su base 6 (1ra instancia; la 2da fue ofrecida en una propuesta)
    Subasta subJuanca = crearSubastaEnCurso(
            users.get("juanca"), owned.get("juanca").get(6).get(0), 72, List.of());
    // sofia oferta en la subasta de juanca con su base 17
    ofertar(subJuanca, users.get("sofia"), List.of(owned.get("sofia").get(17).get(0)));

    // Subasta de sofia (base 16, 2da instancia) CON condición: selección = Argentina
    CondicionImpl condArg = CondicionImpl.builder()
            .nombre("Solo Argentina")
            .descripcion("La oferta debe incluir una figurita de Argentina")
            .filtros(List.of(Filtro.builder().tipo("seleccion").valor("Argentina").build()))
            .build();
    Subasta subSofia = crearSubastaEnCurso(
            users.get("sofia"), owned.get("sofia").get(16).get(1), 48, List.of(condArg));
    // juanca oferta en la subasta de sofia con su base 7 (Argentina, cumple la condición)
    ofertar(subSofia, users.get("juanca"), List.of(owned.get("juanca").get(7).get(0)));

    // Subasta de nico (base 28, 2da instancia), sin ofertas (variedad)
    crearSubastaEnCurso(users.get("nico"), owned.get("nico").get(28).get(1), 24, List.of());
}
```
> Nota de alcance (spec): las subastas quedan EN_CURSO; no se siembra una FINALIZADA con ganador.
> Asegurar que las bases 1..24 son Argentina (lo son, por el orden del catálogo) para que la condición matchee.

- [ ] **Step 3: Verificar compilación**

Run: `cd backend && ./mvnw clean package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java
git commit -m "feat(seed): subastas EN_CURSO con ofertas y condiciones"
```

---

### Task 7: Calificaciones + orquestación `seed()` + counts

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`

**Interfaces:**
- Consumes: `IntercambioRepository.findAll()`, `CalificacionService.crear(Calificacion)` (verificar firma en Step 1), `SugerenciaService.regenerarTodas()`, todos los repos para counts.
- Produces: `DemoSeedResultDTO seed()` (público; el endpoint lo llama).

- [ ] **Step 1: Verificar la firma de `CalificacionService.crear`**

Run: `cd backend && grep -n "public" src/main/java/com/grupo3/tp/service/CalificacionService.java`
Expected: ver el método de creación (probablemente `Calificacion crear(Calificacion c)`). Ajustar la llamada del Step 3 a la firma real.

- [ ] **Step 2: Inyectar `IntercambioRepository`, `CalificacionService`, `SugerenciaService` y todos los repos para counts**

Agregar al constructor: `IntercambioRepository intercambioRepo`, `CalificacionService calificacionService` (o `CalificacionRepository`), `SugerenciaService sugerenciaService`, `SolicitudDeIntercambioRepository solicitudRepo`, `SubastaRepository subastaRepo`, `OfertaRepository ofertaRepo`, `SugerenciaRepository sugerenciaRepo`, `NotificacionRepository notificacionRepo`, `CalificacionRepository calificacionRepo`, `UsuarioRepository usuarioRepo`, `FiguritaRepository figuritaRepo`.

- [ ] **Step 3: Implementar `seedCalificaciones()`**
```java
/** Crea calificaciones cruzadas (4–5) por cada Intercambio existente. */
void seedCalificaciones() {
    for (Intercambio it : intercambioRepo.findAll()) {
        Usuario a = it.getUsuarioGenerador();
        Usuario b = it.getUsuarioIntercambiador();
        if (a == null || b == null) continue;
        calificacionService.crear(Calificacion.builder()
                .usuarioCalificador(a).usuarioCalificado(b).intercambio(it).calificacion(5).build());
        calificacionService.crear(Calificacion.builder()
                .usuarioCalificador(b).usuarioCalificado(a).intercambio(it).calificacion(4).build());
    }
}
```

- [ ] **Step 4: Implementar `seed()` (orquestación + counts)**
```java
/**
 * Reset total + siembra de la cohorte de demo. Orden importante: las transferencias de
 * ownership (aceptar propuestas) ocurren antes de regenerar sugerencias.
 * @return resumen con counts y credenciales para mostrar en la UI.
 */
public DemoSeedResultDTO seed() {
    reset();
    Map<Integer, FiguritaBase> bases = seedCatalogo();
    Map<String, Usuario> users = seedUsuarios();
    Map<String, Map<Integer, List<Figurita>>> owned = seedColecciones(users, bases);
    seedPropuestas(users, owned);
    seedSubastas(users, owned);
    seedCalificaciones();
    sugerenciaService.regenerarTodas();

    return DemoSeedResultDTO.builder()
            .usuarios((int) usuarioRepo.count())
            .figuritasBase((int) figuritaBaseRepo.count())
            .figuritas((int) figuritaRepo.count())
            .solicitudes((int) solicitudRepo.count())
            .intercambios((int) intercambioRepo.count())
            .subastas((int) subastaRepo.count())
            .ofertas((int) ofertaRepo.count())
            .sugerencias((int) sugerenciaRepo.count())
            .notificaciones((int) notificacionRepo.count())
            .calificaciones((int) calificacionRepo.count())
            .protagonistaUsername(PROTAGONISTA).protagonistaPassword(PASS_DEMO)
            .adminUsername("admin").adminPassword(PASS_ADMIN)
            .mensaje("Base reseteada y datos de demo cargados. Logueate como '" + PROTAGONISTA + "'.")
            .build();
}
```

- [ ] **Step 5: Verificar compilación + tests unitarios**

Run: `cd backend && ./mvnw clean package -DskipTests && ./mvnw test -Dtest=DemoSeedServiceTest`
Expected: BUILD SUCCESS + PASS (los 2 tests siguen verdes; `reset()` y `buildUser()` no cambiaron de firma).

- [ ] **Step 6: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java
git commit -m "feat(seed): calificaciones + orquestación seed() con counts"
```

---

### Task 8: Endpoint `POST /api/admin/seed-demo`

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/controller/AdminController.java`

**Interfaces:**
- Consumes: `DemoSeedService.seed()` (Task 7).
- Produces: `POST /api/admin/seed-demo` → `200 DemoSeedResultDTO` (hereda `@PreAuthorize("hasRole('ADMIN')")` de la clase).

- [ ] **Step 1: Inyectar `DemoSeedService` y agregar el endpoint**

En `AdminController`, agregar al constructor el parámetro `DemoSeedService demoSeedService` (y el campo), e importar `com.grupo3.tp.dtos.DemoSeedResultDTO` y `com.grupo3.tp.service.DemoSeedService`. Agregar:
```java
/** Resetea toda la base y carga la cohorte de datos de demo. Acción destructiva, admin-only. */
@PostMapping("/seed-demo")
public ResponseEntity<DemoSeedResultDTO> seedDemo() {
    return ResponseEntity.ok(demoSeedService.seed());
}
```

- [ ] **Step 2: Verificar compilación**

Run: `cd backend && ./mvnw clean package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 3: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add backend/src/main/java/com/grupo3/tp/controller/AdminController.java
git commit -m "feat(seed): endpoint POST /api/admin/seed-demo (admin)"
```

---

### Task 9: Frontend — `adminService.seedDemo()` + test

**Files:**
- Modify: `frontend/src/services/adminService.ts`
- Test: `frontend/src/services/adminService.test.ts`

**Interfaces:**
- Produces: `interface SeedResult` (espejo de `DemoSeedResultDTO`) y `adminService.seedDemo(): Promise<SeedResult>` (POST `/admin/seed-demo`).

- [ ] **Step 1: Escribir el test fallido**

`frontend/src/services/adminService.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from './adminService';

describe('adminService.seedDemo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('hace POST a /admin/seed-demo y devuelve el resumen', async () => {
    const fakeResult = { usuarios: 12, protagonistaUsername: 'juanca' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => fakeResult,
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await adminService.seedDemo();

    expect(res).toEqual(fakeResult);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/admin/seed-demo');
    expect(init.method).toBe('POST');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npx vitest run src/services/adminService.test.ts`
Expected: FAIL ("seedDemo is not a function").

- [ ] **Step 3: Implementar `seedDemo` + tipo**

En `frontend/src/services/adminService.ts`, agregar:
```ts
export interface SeedResult {
  usuarios: number; figuritasBase: number; figuritas: number; solicitudes: number;
  intercambios: number; subastas: number; ofertas: number; sugerencias: number;
  notificaciones: number; calificaciones: number;
  protagonistaUsername: string; protagonistaPassword: string;
  adminUsername: string; adminPassword: string; mensaje: string;
}
```
y dentro del objeto `adminService`, agregar el método:
```ts
  async seedDemo(): Promise<SeedResult> {
    return apiFetch<SeedResult>('/admin/seed-demo', { method: 'POST' });
  },
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd frontend && npx vitest run src/services/adminService.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add frontend/src/services/adminService.ts frontend/src/services/adminService.test.ts
git commit -m "feat(seed): adminService.seedDemo()"
```

---

### Task 10: Frontend — componente `SeedDemoCard` (tarjeta + modal con gating `RESET`) + test

**Files:**
- Create: `frontend/src/pages/admin/components/SeedDemoCard.tsx`
- Test: `frontend/src/pages/admin/components/SeedDemoCard.test.tsx`

**Interfaces:**
- Consumes: `adminService.seedDemo` (Task 9) — inyectable vía prop `onSeed` para test.
- Produces: `export default function SeedDemoCard(props: { onDone?: () => void; onSeed?: () => Promise<SeedResult> })`.

- [ ] **Step 1: Escribir el test fallido**

`frontend/src/pages/admin/components/SeedDemoCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SeedDemoCard from './SeedDemoCard';

describe('SeedDemoCard', () => {
  it('habilita confirmar solo al tipear RESET y dispara onSeed', () => {
    const onSeed = vi.fn().mockResolvedValue({ mensaje: 'ok' });
    render(<SeedDemoCard onSeed={onSeed} />);

    fireEvent.click(screen.getByText('Resetear base y cargar datos de demo'));

    const confirmar = screen.getByRole('button', { name: 'Confirmar reset' }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Escribí RESET'), { target: { value: 'RESET' } });
    expect(confirmar.disabled).toBe(false);

    fireEvent.click(confirmar);
    expect(onSeed).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npx vitest run src/pages/admin/components/SeedDemoCard.test.tsx`
Expected: FAIL ("Cannot find module './SeedDemoCard'").

- [ ] **Step 3: Implementar `SeedDemoCard`**

`frontend/src/pages/admin/components/SeedDemoCard.tsx`:
```tsx
import { useState } from 'react';
import { adminService, type SeedResult } from '../../../services/adminService';

const RED = '#D82D31';

interface Props {
  onDone?: () => void;
  onSeed?: () => Promise<SeedResult>;
}

export default function SeedDemoCard({ onDone, onSeed = adminService.seedDemo }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => { setOpen(false); setConfirmText(''); setError(null); };

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const res = await onSeed();
      setResult(res);
      setOpen(false); setConfirmText('');
      onDone?.();
    } catch {
      setError('Falló el reset/seed. Revisá la conexión y que seas admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="bg-surface rounded-2xl p-5"
      style={{ border: `1.5px solid ${RED}30` }}
    >
      <h2 className="text-sm font-bold text-text uppercase tracking-wider" style={{ color: RED }}>
        Mantenimiento de datos
      </h2>
      <p className="text-xs text-muted mt-1 mb-4">
        Borra TODA la base y carga una cohorte de prueba (~12 usuarios). Acción destructiva.
      </p>

      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 font-bold rounded-lg text-white hover:opacity-90 transition-opacity"
        style={{ background: RED }}
      >
        Resetear base y cargar datos de demo
      </button>

      {result && (
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: `${RED}15`, color: RED }}>
          <p className="font-bold">{result.mensaje}</p>
          <p className="mt-1 text-text">
            {result.usuarios} usuarios · {result.figuritas} figuritas · {result.solicitudes} propuestas ·{' '}
            {result.subastas} subastas · {result.ofertas} ofertas · {result.sugerencias} sugerencias ·{' '}
            {result.notificaciones} notificaciones
          </p>
          <p className="mt-1 text-text">
            Login protagonista: <b>{result.protagonistaUsername}</b> / {result.protagonistaPassword}
          </p>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full mx-4 border border-border">
            <h3 className="text-lg font-bold text-text">¿Resetear toda la base?</h3>
            <p className="text-xs text-muted mt-2">
              Esto borra <b>todos</b> los datos (incluida la base de producción, que es compartida) y
              carga la cohorte de demo. Escribí <b>RESET</b> para confirmar.
            </p>
            <input
              type="text"
              placeholder="Escribí RESET"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full p-2 mt-3 bg-surface border border-border rounded-lg text-text"
            />
            {error && <p className="text-xs mt-2" style={{ color: RED }}>{error}</p>}
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={close}
                disabled={loading}
                className="px-3 py-2 text-sm rounded-lg border border-border text-text"
              >
                Cancelar
              </button>
              <button
                onClick={run}
                disabled={confirmText !== 'RESET' || loading}
                aria-label="Confirmar reset"
                className="px-3 py-2 text-sm font-bold rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: RED }}
              >
                {loading ? 'Reseteando…' : 'Confirmar reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd frontend && npx vitest run src/pages/admin/components/SeedDemoCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add frontend/src/pages/admin/components/SeedDemoCard.tsx \
        frontend/src/pages/admin/components/SeedDemoCard.test.tsx
git commit -m "feat(seed): SeedDemoCard con modal y confirmación RESET"
```

---

### Task 11: Frontend — integrar `SeedDemoCard` en `AdminPage` + verificación end-to-end

**Files:**
- Modify: `frontend/src/pages/admin/AdminPage.tsx`

**Interfaces:**
- Consumes: `SeedDemoCard` (Task 10), `adminService.getStats` (existente).

- [ ] **Step 1: Renderizar la tarjeta y refrescar stats al terminar**

En `AdminPage.tsx`: importar `import SeedDemoCard from './components/SeedDemoCard';`. Extraer la carga de stats a una función reutilizable y pasarla como `onDone`:
```tsx
// reemplazar el useEffect actual por:
const loadStats = () => {
  setLoading(true);
  adminService.getStats()
    .then(setStats)
    .catch(() => setError('No se pudieron cargar las estadísticas.'))
    .finally(() => setLoading(false));
};
useEffect(() => { loadStats(); }, []);
```
Y dentro del JSX, debajo del bloque de título (después del botón "Regalar Figurita"), agregar:
```tsx
<SeedDemoCard onDone={loadStats} />
```

- [ ] **Step 2: Lint + build del frontend**

Run: `cd frontend && npm run lint && npm run build`
Expected: sin errores de ESLint ni de TypeScript.

- [ ] **Step 3: Correr toda la suite de tests del frontend**

Run: `cd frontend && npm run test`
Expected: PASS (incluye los nuevos `adminService.test.ts` y `SeedDemoCard.test.tsx`).

- [ ] **Step 4: Verificación manual end-to-end**

1. Levantar la app: `docker compose up --build` (o apuntar a AWS).
2. Si la base está vacía, registrar `admin` desde la UI una vez.
3. Login `admin`/`adminpass123` → ir a `/admin`.
4. Click "Resetear base y cargar datos de demo" → tipear `RESET` → Confirmar.
5. Verificar el resumen (counts > 0).
6. Logout → login `juanca`/`demo1234` → Dashboard. **Checklist visual:**
   - Progreso de colección ~31% (15/48), con publicadas/excedentes.
   - Propuestas: ≥1 recibida PENDIENTE (valen), historial con aceptadas; enviadas con ≥1 pendiente (lucas).
   - Subastas activas: la propia (con oferta de sofia) y participando (la de sofia).
   - Sugerencias: ≥3 contrapartes.
   - Novedades/alertas: notificaciones de propuesta aceptada/recibida.
7. `/admin`: stats no vacías (usuarios=12, subastas=3, ofertas≥2).

- [ ] **Step 5: Checkpoint** (commit solo si el usuario lo pide)
```bash
git add frontend/src/pages/admin/AdminPage.tsx
git commit -m "feat(seed): integrar SeedDemoCard en AdminPage"
```

---

## Self-Review (cobertura vs spec)

- **Endpoint admin /seed-demo:** Task 8. ✓
- **DemoSeedService (reset 15 colecciones):** Task 1 (+ test). ✓
- **Catálogo (reuse seeder):** Task 2. ✓
- **12 usuarios, password hasheada, rol explícito:** Task 3 (+ test buildUser). ✓
- **Matriz colecciones/repetidas/faltantes/sugerencias bidireccionales:** Task 4. ✓
- **Propuestas recibidas/enviadas + aceptar/rechazar (+ notif/intercambios):** Task 5. ✓
- **Subastas EN_CURSO + ofertas + condiciones:** Task 6. ✓
- **Calificaciones sobre intercambios:** Task 7. ✓
- **regenerarTodas() al final:** Task 7 (orden en `seed()`). ✓
- **DemoSeedResultDTO con counts + credenciales:** Task 1 + Task 7. ✓
- **Frontend: botón + modal gating RESET + resumen + refresh stats:** Tasks 9–11. ✓
- **Guarda = admin-only + confirm UI (sin flag):** Task 8 (admin) + Task 10 (modal). ✓
- **Fuera de alcance documentado (subasta finalizada con ganador):** nota en Task 6. ✓

**Notas/decisiones de implementación:**
- El endpoint es single-action (siempre reset+seed); se simplificó respecto del `reset` param de la spec (acordado: el botón es una sola acción).
- Tests unitarios backend acotados a invariantes no-DB (`reset()`, `buildUser()`); la siembra completa se valida manualmente (Task 11) — consistente con la madurez de testing del repo (los services con DB no tienen test de integración hoy). La protección ADMIN del endpoint es heredada de `AdminController` (no se agrega `@WebMvcTest` para no introducir infra nueva).
