# Colección self-service (agregar poseídas + wishlist de faltantes) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al usuario un form self-service para construir su colección — elegir una figurita del maestro e indicar cuántas tiene (poseídas, con cantidad = total) o declararla como faltante (wishlist) — y reapuntar sugerencias (US4) y notificaciones (US11) a esa wishlist declarada.

**Architecture:** Se agrega un `@Document` `Faltante` (wishlist declarada) y un orquestador `ColeccionService` que concentra el alta de copias (`setCantidad`) y las operaciones de wishlist. Bajar la cantidad por debajo de copias comprometidas dispara una cascada que desarma publicaciones/subastas/propuestas (soft-cancel + notificación) antes de borrar la copia. El frontend agrega un modal reutilizable con el buscador del maestro en dos modos.

**Tech Stack:** Backend Java 21 / Spring Boot 4 / Spring Data MongoDB / Lombok / JUnit5 + Mockito. Frontend React 19 / Vite / TS / React Query / Axios / Vitest.

## Global Constraints

- Backend package raíz: `com.grupo3.tp`. Endpoints nuevos bajo `/api/usuarios/{username}/...`.
- Modelos: `@Data @NoArgsConstructor @AllArgsConstructor @Builder`, `@Document`, `@Id private String id`. Refs cruzadas `@DocumentReference(lazy = true)`.
- Métodos de servicio nombrados en español (consistencia con el código existente).
- Tests backend: JUnit5 + Mockito (`@ExtendWith(MockitoExtension.class)`, `@Mock`, builders). Las queries Mongo de repositorios NO se testean unitariamente (requieren Mongo vivo) — se cubren por E2E/Puppeteer.
- Frontend: colores inline (`const BLUE = '#03BAE9'` búsqueda, `RED = '#D82D31'`, `GREEN = '#05B15A'`), cards `rounded-2xl`, modales montados condicionalmente. Llamadas de negocio vía `api` (axios) con el interceptor JWT ya configurado.
- Auth: los writes validan que el caller (principal del JWT) sea `{username}` o tenga rol admin.
- Comandos: backend `cd backend && ./mvnw test`; frontend `cd frontend && npm run build && npm run lint && npm run test`.
- **No commitear/pushear/deployar hasta el final** (lo hace la Fase D, ya autorizado por el usuario para este trabajo).

---

## File Structure

**Backend nuevos:**
- `models/Faltante.java` — doc de wishlist (usuarioId, figuritaBaseId, figuritaBase ref, fecha).
- `repository/FaltanteRepository.java` — MongoRepository + derived queries.
- `service/ColeccionService.java` — orquestador: setCantidad + wishlist + liberarFigurita.
- `controller/ColeccionController.java` — endpoints self-service.
- `dtos/SetCantidadRequestDTO.java`, `dtos/FaltanteRequestDTO.java`.

**Backend modificados:**
- `models/EstadoSubasta.java` (+CANCELADA), `models/SolicitudDeIntercambio.java` (+CANCELADO en enum).
- `repository/SubastaRepositoryCustom.java` + `SubastaRepositoryImpl.java` (+findByFiguritaId).
- `repository/SolicitudDeIntercambioRepositoryCustom.java` + `...Impl.java` (+findPendientesByFiguritaId).
- `service/SubastaService.java` (+cancelarPorFigurita), `service/SolicitudDeIntercambioService.java` (+cancelarPorFigurita).
- `controller/UsuarioController.java` (mover/quitar getFaltantes → ahora en ColeccionController).
- `service/SugerenciaService.java` (US4 desde wishlist), `repository/UsuarioRepositoryImpl.java` (US11 desde wishlist).

**Frontend nuevos:**
- `src/pages/coleccion/components/AgregarFiguritaModal.tsx`.

**Frontend modificados:**
- `src/hooks/useFiguritas.ts` (tipar wishlist), `TodasPage.tsx`, `RepetidasPage.tsx`, `FaltantesPage.tsx`, `components/TarjetaColeccion.tsx` (+onRemove), `src/hooks/useSubastas.ts` (+CANCELADA), subastas `AuctionCard.tsx`/`MiasPage.tsx`, propuestas `EnviadasPage.tsx`/`RecibidasPage.tsx` (+CANCELADO).

---

# FASE A — Núcleo: alta de poseídas + wishlist (seguro, sin cascada)

### Task A1: Modelo `Faltante` + repositorio

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/models/Faltante.java`
- Create: `backend/src/main/java/com/grupo3/tp/repository/FaltanteRepository.java`

**Interfaces:**
- Produces: `Faltante` (builder: `usuarioId`, `figuritaBaseId`, `figuritaBase`, `fecha`); `FaltanteRepository` con `findByUsuarioId(String, Pageable)`, `existsByUsuarioIdAndFiguritaBaseId(String,String)`, `deleteByUsuarioIdAndFiguritaBaseId(String,String)` (returns long), `findByFiguritaBaseId(String)`, `findByUsuarioId(String)`.

- [ ] **Step 1: Crear el modelo**

`models/Faltante.java`:
```java
package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import java.time.LocalDateTime;

/**
 * Wishlist declarada (US4/US11): una base que un usuario dice que le falta.
 * Se denormaliza {@code figuritaBaseId} (String) para las queries de matching/US11
 * y se guarda la ref {@code figuritaBase} para armar el DTO de la pantalla de faltantes.
 */
@Document(collection = "faltantes")
@CompoundIndex(name = "usuario_base_unico", def = "{'usuarioId': 1, 'figuritaBaseId': 1}", unique = true)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Faltante {
    @Id
    private String id;
    private String usuarioId;
    private String figuritaBaseId;
    @DocumentReference(lazy = true)
    private FiguritaBase figuritaBase;
    private LocalDateTime fecha;
}
```

- [ ] **Step 2: Crear el repositorio**

`repository/FaltanteRepository.java`:
```java
package com.grupo3.tp.repository;

import com.grupo3.tp.models.Faltante;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaltanteRepository extends MongoRepository<Faltante, String> {
    List<Faltante> findByUsuarioId(String usuarioId);
    Page<Faltante> findByUsuarioId(String usuarioId, Pageable pageable);
    boolean existsByUsuarioIdAndFiguritaBaseId(String usuarioId, String figuritaBaseId);
    long deleteByUsuarioIdAndFiguritaBaseId(String usuarioId, String figuritaBaseId);
    List<Faltante> findByFiguritaBaseId(String figuritaBaseId);
}
```

- [ ] **Step 3: Compilar**

Run: `cd backend && ./mvnw -q -DskipTests compile`
Expected: BUILD SUCCESS (sin errores de símbolos).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/models/Faltante.java backend/src/main/java/com/grupo3/tp/repository/FaltanteRepository.java
git commit -m "feat(coleccion): modelo Faltante (wishlist) + repositorio"
```

---

### Task A2: DTOs de request

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/dtos/SetCantidadRequestDTO.java`
- Create: `backend/src/main/java/com/grupo3/tp/dtos/FaltanteRequestDTO.java`

**Interfaces:**
- Produces: `SetCantidadRequestDTO` con `Integer cantidad`; `FaltanteRequestDTO` con `String figuritaBaseId`.

- [ ] **Step 1: Crear los DTOs**

`dtos/SetCantidadRequestDTO.java`:
```java
package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SetCantidadRequestDTO {
    private Integer cantidad;
}
```

`dtos/FaltanteRequestDTO.java`:
```java
package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FaltanteRequestDTO {
    private String figuritaBaseId;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/dtos/SetCantidadRequestDTO.java backend/src/main/java/com/grupo3/tp/dtos/FaltanteRequestDTO.java
git commit -m "feat(coleccion): DTOs de request para set-cantidad y faltante"
```

---

### Task A3: `ColeccionService` (núcleo: setCantidad raise-only + wishlist)

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/service/ColeccionService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/ColeccionServiceTest.java`

**Interfaces:**
- Consumes: `FiguritaService.{obtenerTodasInternaPorUserId, crear, eliminar, obtenerPorId}`, `FiguritaBaseService.obtenerPorId`, `UsuarioService.loadUserByUsername`, `FaltanteRepository`.
- Produces:
  - `FiguritaResponseDTO setCantidad(String username, String figuritaBaseId, int cantidad)`
  - `void agregarFaltante(String username, String figuritaBaseId)`
  - `void quitarFaltante(String username, String figuritaBaseId)`
  - `Page<FiguritaBaseDTO> listarFaltantes(String username, Pageable pageable)`

- [ ] **Step 1: Escribir el test que falla**

`test/.../service/ColeccionServiceTest.java`:
```java
package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FaltanteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ColeccionServiceTest {

    @Mock private FiguritaService figuritaService;
    @Mock private FiguritaBaseService figuritaBaseService;
    @Mock private UsuarioService usuarioService;
    @Mock private FaltanteRepository faltanteRepository;

    private ColeccionService service;

    private Usuario juan;
    private FiguritaBase base1;

    private Figurita fig(String id, FiguritaBase base, Usuario owner) {
        return Figurita.builder().id(id).figuritaBase(base).owner(owner).build();
    }

    @BeforeEach
    public void setUp() {
        service = new ColeccionService(figuritaService, figuritaBaseService, usuarioService, faltanteRepository);
        juan = Usuario.builder().id("user-1").username("juan").build();
        base1 = FiguritaBase.builder().id("base-1").numero(1)
                .seleccion(new Seleccion("sel-1", "Argentina", "ARG"))
                .equipo(new Equipo("eq-1", "Equipo"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-1", "Messi")).build();
    }

    @Test
    public void setCantidadCreaLasCopiasFaltantes() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(fig("f1", base1, juan))); // ya tiene 1
        when(figuritaService.crear(any(Figurita.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        FiguritaResponseDTO dto = service.setCantidad("juan", "base-1", 3);

        // de 1 a 3 => crea 2
        verify(figuritaService, times(2)).crear(any(Figurita.class));
        assertEquals(3, dto.getCount());
        assertEquals("base-1", dto.getFiguritaBaseId());
        assertEquals("Messi", dto.getJugadorNombre());
    }

    @Test
    public void setCantidadIgualEsNoOp() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(fig("f1", base1, juan), fig("f2", base1, juan)));

        FiguritaResponseDTO dto = service.setCantidad("juan", "base-1", 2);

        verify(figuritaService, never()).crear(any());
        verify(figuritaService, never()).eliminar(any());
        assertEquals(2, dto.getCount());
    }

    @Test
    public void setCantidadMenorLanza409EnFaseA() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(fig("f1", base1, juan), fig("f2", base1, juan)));

        assertThrows(ResponseStatusException.class,
                () -> service.setCantidad("juan", "base-1", 1));
    }

    @Test
    public void agregarFaltanteGuardaSiNoLaPoseeNiExiste() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1")).thenReturn(List.of());
        when(faltanteRepository.existsByUsuarioIdAndFiguritaBaseId("user-1", "base-1")).thenReturn(false);

        service.agregarFaltante("juan", "base-1");

        verify(faltanteRepository).save(argThat(f ->
                f.getUsuarioId().equals("user-1") && f.getFiguritaBaseId().equals("base-1")));
    }

    @Test
    public void agregarFaltanteEsIdempotente() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1")).thenReturn(List.of());
        when(faltanteRepository.existsByUsuarioIdAndFiguritaBaseId("user-1", "base-1")).thenReturn(true);

        service.agregarFaltante("juan", "base-1");

        verify(faltanteRepository, never()).save(any());
    }

    @Test
    public void agregarFaltanteRechazaSiYaLaPosee() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(fig("f1", base1, juan)));

        assertThrows(ResponseStatusException.class,
                () -> service.agregarFaltante("juan", "base-1"));
        verify(faltanteRepository, never()).save(any());
    }

    @Test
    public void quitarFaltante404SiNoEstaba() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(faltanteRepository.deleteByUsuarioIdAndFiguritaBaseId("user-1", "base-1")).thenReturn(0L);

        assertThrows(ResponseStatusException.class,
                () -> service.quitarFaltante("juan", "base-1"));
    }

    @Test
    public void listarFaltantesMapeaABaseDTO() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        Faltante f = Faltante.builder().id("falt-1").usuarioId("user-1")
                .figuritaBaseId("base-1").figuritaBase(base1).build();
        Pageable pageable = PageRequest.of(0, 10);
        when(faltanteRepository.findByUsuarioId("user-1", pageable))
                .thenReturn(new PageImpl<>(List.of(f), pageable, 1));

        Page<FiguritaBaseDTO> page = service.listarFaltantes("juan", pageable);

        assertEquals(1, page.getTotalElements());
        assertEquals("base-1", page.getContent().get(0).getId());
        assertEquals("Messi", page.getContent().get(0).getJugadorNombre());
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw -q test -Dtest=ColeccionServiceTest`
Expected: FAIL de compilación ("cannot find symbol: class ColeccionService").

- [ ] **Step 3: Implementar `ColeccionService`**

`service/ColeccionService.java`:
```java
package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.Faltante;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.FaltanteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Orquestador del alta self-service de colección (US "construir mi colección"):
 * setear la cantidad de copias poseídas de una base y administrar la wishlist de faltantes.
 * En la Fase A, bajar la cantidad no está soportado (409); la Fase B agrega la cascada.
 */
@Service
public class ColeccionService {

    private final FiguritaService figuritaService;
    private final FiguritaBaseService figuritaBaseService;
    private final UsuarioService usuarioService;
    private final FaltanteRepository faltanteRepository;

    public ColeccionService(FiguritaService figuritaService,
                            FiguritaBaseService figuritaBaseService,
                            UsuarioService usuarioService,
                            FaltanteRepository faltanteRepository) {
        this.figuritaService = figuritaService;
        this.figuritaBaseService = figuritaBaseService;
        this.usuarioService = usuarioService;
        this.faltanteRepository = faltanteRepository;
    }

    /** Copias de {@code baseId} que posee el usuario. */
    private List<Figurita> copiasDe(String userId, String baseId) {
        return figuritaService.obtenerTodasInternaPorUserId(userId).stream()
                .filter(f -> f.getFiguritaBase() != null
                        && baseId.equals(f.getFiguritaBase().getId()))
                .toList();
    }

    /** Deja el total de copias de la base en {@code cantidad} (set). */
    public FiguritaResponseDTO setCantidad(String username, String figuritaBaseId, int cantidad) {
        if (cantidad < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad no puede ser negativa");
        }
        Usuario usuario = usuarioService.loadUserByUsername(username);
        FiguritaBase base = figuritaBaseService.obtenerPorId(figuritaBaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FiguritaBase no encontrada"));

        List<Figurita> mias = copiasDe(usuario.getId(), figuritaBaseId);
        int current = mias.size();

        if (cantidad > current) {
            for (int i = 0; i < cantidad - current; i++) {
                figuritaService.crear(Figurita.builder().figuritaBase(base).owner(usuario).build());
            }
        } else if (cantidad < current) {
            // FASE B reemplaza esto por la cascada de liberación.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Reducir la cantidad todavía no está disponible");
        }

        String repId = mias.isEmpty() ? null : mias.get(0).getId();
        return new FiguritaResponseDTO(
                repId, base.getNumero(), base.getId(), cantidad,
                base.getJugador().getNombre(), base.getSeleccion().getNombre(),
                base.getEquipo().getNombre(), base.getCategoria().getNombre(),
                usuario.getId(), usuario.getUsername(), base.getImagenUrl());
    }

    /** Agrega una base a la wishlist (idempotente). Rechaza si ya la posee. */
    public void agregarFaltante(String username, String figuritaBaseId) {
        Usuario usuario = usuarioService.loadUserByUsername(username);
        FiguritaBase base = figuritaBaseService.obtenerPorId(figuritaBaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FiguritaBase no encontrada"));

        boolean laPosee = !copiasDe(usuario.getId(), figuritaBaseId).isEmpty();
        if (laPosee) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya tenés esta figurita");
        }
        if (faltanteRepository.existsByUsuarioIdAndFiguritaBaseId(usuario.getId(), figuritaBaseId)) {
            return; // idempotente
        }
        faltanteRepository.save(Faltante.builder()
                .usuarioId(usuario.getId())
                .figuritaBaseId(figuritaBaseId)
                .figuritaBase(base)
                .fecha(LocalDateTime.now())
                .build());
    }

    /** Quita una base de la wishlist. 404 si no estaba. */
    public void quitarFaltante(String username, String figuritaBaseId) {
        Usuario usuario = usuarioService.loadUserByUsername(username);
        long removed = faltanteRepository.deleteByUsuarioIdAndFiguritaBaseId(usuario.getId(), figuritaBaseId);
        if (removed == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La figurita no estaba en faltantes");
        }
    }

    /** Wishlist del usuario, paginada, mapeada a {@link FiguritaBaseDTO}. */
    public Page<FiguritaBaseDTO> listarFaltantes(String username, Pageable pageable) {
        Usuario usuario = usuarioService.loadUserByUsername(username);
        return faltanteRepository.findByUsuarioId(usuario.getId(), pageable)
                .map(f -> {
                    FiguritaBase b = f.getFiguritaBase();
                    return new FiguritaBaseDTO(
                            b.getId(), b.getNumero(), b.getJugador().getNombre(),
                            b.getSeleccion().getNombre(), b.getEquipo().getNombre(),
                            b.getCategoria().getNombre(), b.getImagenUrl());
                });
    }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw -q test -Dtest=ColeccionServiceTest`
Expected: PASS (8 tests verdes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/service/ColeccionService.java backend/src/test/java/com/grupo3/tp/service/ColeccionServiceTest.java
git commit -m "feat(coleccion): ColeccionService (setCantidad raise-only + wishlist) con tests"
```

---

### Task A4: `ColeccionController` + repurpose GET faltantes

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/controller/ColeccionController.java`
- Modify: `backend/src/main/java/com/grupo3/tp/controller/UsuarioController.java` (quitar `getFaltantes`)

**Interfaces:**
- Consumes: `ColeccionService`.
- Produces (HTTP):
  - `PUT /api/usuarios/{username}/figuritas/{figuritaBaseId}` body `SetCantidadRequestDTO` → `FiguritaResponseDTO`.
  - `GET /api/usuarios/{username}/figuritas/faltantes` → `PagedResponse<FiguritaBaseDTO>` (wishlist).
  - `POST /api/usuarios/{username}/faltantes` body `FaltanteRequestDTO` → 201.
  - `DELETE /api/usuarios/{username}/faltantes/{figuritaBaseId}` → 204.

- [ ] **Step 1: Quitar `getFaltantes` de `UsuarioController`**

En `controller/UsuarioController.java`, ELIMINAR el método `getFaltantes` completo (el bloque `@GetMapping("/{userName}/figuritas/faltantes") ... public ResponseEntity<PagedResponse<FiguritaBaseDTO>> getFaltantes(...) { ... }`). La ruta se re-declara idéntica en `ColeccionController` (Step 2). Dejar intactos `getFiguritasByUsuario` y `getRepetidas`.

- [ ] **Step 2: Crear `ColeccionController`**

`controller/ColeccionController.java`:
```java
package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.FaltanteRequestDTO;
import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.PagedResponse;
import com.grupo3.tp.dtos.SetCantidadRequestDTO;
import com.grupo3.tp.service.ColeccionService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/usuarios")
public class ColeccionController {

    private final ColeccionService coleccionService;

    public ColeccionController(ColeccionService coleccionService) {
        this.coleccionService = coleccionService;
    }

    /** El caller autenticado debe ser {@code username} o admin. */
    private void assertSelfOrAdmin(String username) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !auth.getName().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No podés modificar la colección de otro usuario");
        }
    }

    @PutMapping("/{username}/figuritas/{figuritaBaseId}")
    public ResponseEntity<FiguritaResponseDTO> setCantidad(
            @PathVariable String username,
            @PathVariable String figuritaBaseId,
            @RequestBody SetCantidadRequestDTO body) {
        assertSelfOrAdmin(username);
        if (body == null || body.getCantidad() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta 'cantidad'");
        }
        return ResponseEntity.ok(coleccionService.setCantidad(username, figuritaBaseId, body.getCantidad()));
    }

    /** Wishlist declarada del usuario (reemplaza el faltante derivado). */
    @GetMapping("/{username}/figuritas/faltantes")
    public ResponseEntity<PagedResponse<FiguritaBaseDTO>> getFaltantes(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 2000));
        return ResponseEntity.ok(PagedResponse.from(coleccionService.listarFaltantes(username, pageable)));
    }

    @PostMapping("/{username}/faltantes")
    public ResponseEntity<Void> agregarFaltante(
            @PathVariable String username,
            @RequestBody FaltanteRequestDTO body) {
        assertSelfOrAdmin(username);
        if (body == null || body.getFiguritaBaseId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta 'figuritaBaseId'");
        }
        coleccionService.agregarFaltante(username, body.getFiguritaBaseId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{username}/faltantes/{figuritaBaseId}")
    public ResponseEntity<Void> quitarFaltante(
            @PathVariable String username,
            @PathVariable String figuritaBaseId) {
        assertSelfOrAdmin(username);
        coleccionService.quitarFaltante(username, figuritaBaseId);
        return ResponseEntity.noContent().build();
    }
}
```

> **Nota de routing:** el GET faltantes queda con la MISMA ruta que antes (`/{username}/figuritas/faltantes`) pero ahora en `ColeccionController`; por eso el Step 1 lo elimina de `UsuarioController` (dos handlers para la misma ruta = arranque fallido). El path var pasa a llamarse `username` (antes `userName`); no afecta al cliente.

- [ ] **Step 3: Verificar que arranca (contexto Spring)**

Run: `cd backend && ./mvnw -q -DskipTests compile`
Expected: BUILD SUCCESS. (El arranque real se valida en la verificación E2E de la Fase D.)

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/controller/ColeccionController.java backend/src/main/java/com/grupo3/tp/controller/UsuarioController.java
git commit -m "feat(coleccion): endpoints self-service (PUT cantidad, wishlist CRUD) + repurpose GET faltantes"
```

---

### Task A5: Frontend — modal `AgregarFiguritaModal` + tipar wishlist

**Files:**
- Create: `frontend/src/pages/coleccion/components/AgregarFiguritaModal.tsx`
- Modify: `frontend/src/hooks/useFiguritas.ts` (comentario del hook faltantes: ahora wishlist)

**Interfaces:**
- Consumes: `useCatalogoFiguritas`, `useAuth`, `api`, `useDebouncedValue`.
- Produces: `AgregarFiguritaModal` con props `{ mode: 'poseida' | 'faltante'; onClose: () => void; onDone: () => void }` (default export).

- [ ] **Step 1: Crear el modal**

`src/pages/coleccion/components/AgregarFiguritaModal.tsx`:
```tsx
import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import api from '../../../services/api';
import { useCatalogoFiguritas } from '../../../hooks/useCatalogoFiguritas';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import type { FiguritaResponseDTO } from '../../../hooks/useFiguritas';
import Paginador from '../../../components/Paginador';

const BLUE = '#03BAE9';

interface Props {
  mode: 'poseida' | 'faltante';
  onClose: () => void;
  onDone: () => void;
}

/**
 * Modal para construir la colección desde el maestro.
 * - modo 'poseida': elegís una figu + cantidad (total) → PUT /figuritas/{baseId}.
 * - modo 'faltante': elegís una figu → POST /faltantes (excluye lo que ya tenés).
 */
export default function AgregarFiguritaModal({ mode, onClose, onDone }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [busyBaseId, setBusyBaseId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const debounced = useDebouncedValue(search, 300);

  // faltante: excluye lo que el usuario ya posee (usuarioId). poseida: todo el maestro.
  const { data, isLoading } = useCatalogoFiguritas({
    page,
    search: debounced.trim() || undefined,
    usuarioId: mode === 'faltante' ? user?.id : undefined,
  });
  const items = data?.content ?? [];

  const handleSelect = async (f: FiguritaResponseDTO) => {
    if (!user) return;
    setMsg(null);
    try {
      if (mode === 'poseida') {
        const input = window.prompt(`¿Cuántas copias de ${f.jugadorNombre} tenés en total?`, '1');
        if (input === null) return;
        const cantidad = parseInt(input, 10);
        if (isNaN(cantidad) || cantidad < 1) { alert('Ingresá un número mayor o igual a 1'); return; }
        setBusyBaseId(f.figuritaBaseId);
        await api.put(`/api/usuarios/${user.username}/figuritas/${f.figuritaBaseId}`, { cantidad });
        setMsg(`✔ ${f.jugadorNombre}: ahora tenés ${cantidad}`);
      } else {
        setBusyBaseId(f.figuritaBaseId);
        await api.post(`/api/usuarios/${user.username}/faltantes`, { figuritaBaseId: f.figuritaBaseId });
        setMsg(`✔ ${f.jugadorNombre} agregada a faltantes`);
      }
      onDone();
    } catch (error: any) {
      const detail = error.response?.data?.message || error.response?.data?.error;
      alert(detail || 'No se pudo completar la acción.');
    } finally {
      setBusyBaseId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-border w-full max-w-3xl max-h-[85vh] flex flex-col p-6"
        style={{ borderColor: `${BLUE}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">
            {mode === 'poseida' ? 'Agregar figurita a mi colección' : 'Agregar figurita a faltantes'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">✕</button>
        </div>

        <input
          type="text"
          autoFocus
          aria-label="Buscar en el maestro"
          placeholder="Buscar por jugador, selección o número…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full p-3 mb-3 bg-surface2 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />

        {msg && <p className="text-xs mb-2" style={{ color: '#05B15A' }}>{msg}</p>}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-muted text-sm py-6 text-center">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-muted text-sm py-6 text-center">Sin resultados</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((f) => (
                <button
                  key={f.figuritaBaseId}
                  onClick={() => handleSelect(f)}
                  disabled={busyBaseId === f.figuritaBaseId}
                  className="text-left bg-surface2 p-3 rounded-lg border border-border hover:border-primary transition-colors disabled:opacity-50"
                >
                  <div className="w-full aspect-square bg-surface rounded mb-2 flex items-center justify-center overflow-hidden">
                    {f.imagenUrl ? (
                      <img src={f.imagenUrl} alt={f.jugadorNombre} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted">#{f.numero}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{f.seleccionNombre}</p>
                  <p className="text-sm font-bold text-primary">{f.jugadorNombre}</p>
                  <p className="text-xs text-text">#{f.numero}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3">
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Actualizar el comentario del hook de faltantes**

En `src/hooks/useFiguritas.ts`, cambiar el doc-comment de `useFaltantesPaginadas` de:
```typescript
/** Figuritas que el usuario no tiene, paginadas y filtradas server-side. */
```
a:
```typescript
/** Wishlist declarada del usuario (faltantes que marcó), paginada. */
```
(El endpoint y la firma no cambian; sólo la semántica documentada.)

- [ ] **Step 3: Verificar build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build OK, lint sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/coleccion/components/AgregarFiguritaModal.tsx frontend/src/hooks/useFiguritas.ts
git commit -m "feat(coleccion): AgregarFiguritaModal (maestro, 2 modos)"
```

---

### Task A6: Frontend — botones "Agregar Figurita" en las 3 pestañas + quitar-faltante

**Files:**
- Modify: `frontend/src/pages/coleccion/components/TarjetaColeccion.tsx` (+`onRemove`)
- Modify: `frontend/src/pages/coleccion/TodasPage.tsx`, `RepetidasPage.tsx`, `FaltantesPage.tsx`

**Interfaces:**
- Consumes: `AgregarFiguritaModal`.
- Produces: `TarjetaColeccion` con prop opcional `onRemove?: () => void`.

- [ ] **Step 1: Agregar `onRemove` a `TarjetaColeccion`**

En `TarjetaColeccion.tsx`, en la interfaz `TarjetaColeccionProps` agregar debajo de `onClick?`:
```tsx
  /** Si se provee, muestra un botón "Quitar" (para faltantes/wishlist). */
  onRemove?: () => void;
```
Desestructurar `onRemove` en los props de la función (agregarlo a la lista `{ ... , onClick, onRemove, onPublishExchange, ... }`).
Y renderizar el botón dentro del bloque `<div className="mt-auto mb-3">{footer}</div>` reemplazándolo por:
```tsx
      {(footer || onRemove) && (
        <div className="mt-auto mb-3 flex items-center justify-between gap-2">
          <span>{footer}</span>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-red-500 hover:border-red-500 transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
      )}
```

- [ ] **Step 2: `TodasPage` — botón Agregar (modo poseída)**

En `TodasPage.tsx`:
- Import: `import { useState } from 'react';` ya existe; agregar `import AgregarFiguritaModal from './components/AgregarFiguritaModal';`.
- Estado: agregar `const [showAdd, setShowAdd] = useState(false);`.
- En el `<ListToolbar ...>`, agregar antes del `<PageSizeSelector .../>`:
```tsx
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 transition-colors"
            >
              + Agregar Figurita
            </button>
```
- Antes del cierre del fragment `</>` final del return, agregar:
```tsx
      {showAdd && (
        <AgregarFiguritaModal
          mode="poseida"
          onClose={() => setShowAdd(false)}
          onDone={() => refetch()}
        />
      )}
```

- [ ] **Step 3: `RepetidasPage` — botón Agregar (modo poseída)**

Aplicar exactamente los mismos 3 cambios que en Step 2 a `RepetidasPage.tsx` (import de `AgregarFiguritaModal`, estado `showAdd`, botón en `ListToolbar`, y el bloque `{showAdd && ...}` con `mode="poseida"` y `onDone={() => refetch()}`).

- [ ] **Step 4: `FaltantesPage` — botón Agregar (modo faltante) + quitar**

En `FaltantesPage.tsx`:
- Imports: agregar `import { useState } from 'react';`, `import api from '../../services/api';`, `import AgregarFiguritaModal from './components/AgregarFiguritaModal';`.
- Estado: `const [showAdd, setShowAdd] = useState(false);`.
- Handler de quitar:
```tsx
  const handleRemove = async (baseId: string) => {
    if (!user) return;
    try {
      await api.delete(`/api/usuarios/${user.username}/faltantes/${baseId}`);
      await refetch();
    } catch {
      alert('No se pudo quitar de faltantes.');
    }
  };
```
- En el `<ListToolbar ...>`, agregar antes del `<PageSizeSelector .../>` el mismo botón `+ Agregar Figurita` del Step 2.
- En cada `<TarjetaColeccion ...>` agregar la prop `onRemove={() => handleRemove(f.id)}` (además del `onClick` existente).
- Antes del cierre del fragment `</>` final, agregar:
```tsx
      {showAdd && (
        <AgregarFiguritaModal
          mode="faltante"
          onClose={() => setShowAdd(false)}
          onDone={() => refetch()}
        />
      )}
```
- Cambiar el `emptyMessage` de `GrillaFiguritas` de `"¡Tienes todas las figuritas!"` a `"No marcaste faltantes todavía"`.

- [ ] **Step 5: Verificar build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: build OK, lint sin errores nuevos.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/coleccion/
git commit -m "feat(coleccion): botones Agregar Figurita en las 3 pestañas + quitar faltante"
```

---

# FASE B — Cascada de liberación (soft-cancel + notificaciones)

### Task B1: Estados `CANCELADA` / `CANCELADO`

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/models/EstadoSubasta.java`
- Modify: `backend/src/main/java/com/grupo3/tp/models/SolicitudDeIntercambio.java`

- [ ] **Step 1: Agregar `CANCELADA` a `EstadoSubasta`**

Reemplazar el enum por:
```java
package com.grupo3.tp.models;

public enum EstadoSubasta {
    PENDIENTE,
    EN_CURSO,
    FINALIZADA,
    CANCELADA
}
```

- [ ] **Step 2: Agregar `CANCELADO` al enum `EstadoSolicitud`**

En `SolicitudDeIntercambio.java`, reemplazar el enum anidado por:
```java
    public enum EstadoSolicitud {
        PENDIENTE,
        ACEPTADO,
        RECHAZADO,
        CANCELADO
    }
```

- [ ] **Step 3: Compilar + commit**

Run: `cd backend && ./mvnw -q -DskipTests compile` (Expected: BUILD SUCCESS)
```bash
git add backend/src/main/java/com/grupo3/tp/models/EstadoSubasta.java backend/src/main/java/com/grupo3/tp/models/SolicitudDeIntercambio.java
git commit -m "feat(coleccion): estados CANCELADA/CANCELADO para la cascada"
```

---

### Task B2: Reverse-lookups (subasta por figurita, solicitudes pendientes por figurita)

**Files:**
- Modify: `repository/SubastaRepositoryCustom.java`, `repository/SubastaRepositoryImpl.java`
- Modify: `repository/SolicitudDeIntercambioRepositoryCustom.java`, `repository/SolicitudDeIntercambioRepositoryImpl.java`

**Interfaces:**
- Produces: `SubastaRepository.findByFiguritaId(String)`, `SolicitudDeIntercambioRepository.findPendientesByFiguritaId(String)`.

- [ ] **Step 1: `SubastaRepositoryCustom` — declarar el método**

Agregar dentro de la interfaz (después de `findByEstadoAndHoraFinBefore`):
```java
    List<Subasta> findByFiguritaId(String figuritaId);
```

- [ ] **Step 2: `SubastaRepositoryImpl` — implementar**

Agregar el método (mismo patrón que `findByUsuarioId`), sólo subastas activas:
```java
    @Override
    public List<Subasta> findByFiguritaId(String figuritaId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("figurita").is(new ObjectId(figuritaId))
                        .and("estado").in(EstadoSubasta.PENDIENTE, EstadoSubasta.EN_CURSO)),
                Subasta.class
        );
    }
```

- [ ] **Step 3: `SolicitudDeIntercambioRepositoryCustom` — declarar**

Agregar:
```java
    List<SolicitudDeIntercambio> findPendientesByFiguritaId(String figuritaId);
```

- [ ] **Step 4: `SolicitudDeIntercambioRepositoryImpl` — implementar**

Cubre tanto la figurita pedida (`figurita`) como las ofrecidas (`figuritasOfrecidas`), sólo PENDIENTE. Agregar (ajustando imports si faltara `EstadoSolicitud`; es `SolicitudDeIntercambio.EstadoSolicitud`):
```java
    @Override
    public List<SolicitudDeIntercambio> findPendientesByFiguritaId(String figuritaId) {
        ObjectId oid = new ObjectId(figuritaId);
        Criteria criteria = new Criteria().andOperator(
                Criteria.where("estado").is(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE),
                new Criteria().orOperator(
                        Criteria.where("figurita").is(oid),
                        Criteria.where("figuritasOfrecidas").is(oid)
                )
        );
        return mongoTemplate.find(Query.query(criteria), SolicitudDeIntercambio.class);
    }
```

- [ ] **Step 5: Compilar + commit**

Run: `cd backend && ./mvnw -q -DskipTests compile` (Expected: BUILD SUCCESS)
```bash
git add backend/src/main/java/com/grupo3/tp/repository/SubastaRepository*.java backend/src/main/java/com/grupo3/tp/repository/SolicitudDeIntercambioRepository*.java
git commit -m "feat(coleccion): reverse-lookups de subasta/solicitud por figurita"
```

---

### Task B3: `SubastaService.cancelarPorFigurita`

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/SubastaService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/SubastaServiceCancelTest.java`

**Interfaces:**
- Produces: `void SubastaService.cancelarPorFigurita(String figuritaId)`.

- [ ] **Step 1: Escribir el test que falla**

`test/.../service/SubastaServiceCancelTest.java`:
```java
package com.grupo3.tp.service;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SubastaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubastaServiceCancelTest {

    @Mock private SubastaRepository repository;
    @Mock private FiguritaService figuritaService;
    @Mock private NotificacionService notificacionService;
    @Mock private UsuarioService usuarioService;
    @Mock private UsuarioRepository usuarioRepository;

    private SubastaService service;

    @BeforeEach
    public void setUp() {
        service = new SubastaService(repository, figuritaService, notificacionService, usuarioService, usuarioRepository);
    }

    @Test
    public void cancelarPorFiguritaMarcaCanceladaYNotificaAOfertantes() {
        FiguritaBase base = FiguritaBase.builder().id("base-1").numero(1)
                .seleccion(new Seleccion("s", "Argentina", "A"))
                .equipo(new Equipo("e", "Equipo"))
                .categoria(new CategoriaFigurita("c", "Oro"))
                .jugador(new Jugador("j", "Messi")).build();
        Figurita fig = Figurita.builder().id("fig-1").figuritaBase(base).build();
        Usuario postor = Usuario.builder().id("user-9").username("pedro").build();
        Oferta oferta = Oferta.builder().id("of-1").usuario(postor).figuritas(List.of()).build();
        Subasta subasta = Subasta.builder().id("sub-1").figurita(fig)
                .estado(EstadoSubasta.EN_CURSO).ofertas(List.of(oferta)).build();

        when(repository.findByFiguritaId("fig-1")).thenReturn(List.of(subasta));

        service.cancelarPorFigurita("fig-1");

        assertEquals(EstadoSubasta.CANCELADA, subasta.getEstado());
        verify(repository).save(subasta);
        verify(notificacionService).crear(argThat(n ->
                n.getUsuario() == postor && "subasta".equals(n.getTipo())));
    }

    @Test
    public void cancelarPorFiguritaSinSubastasNoHaceNada() {
        when(repository.findByFiguritaId("fig-1")).thenReturn(List.of());
        service.cancelarPorFigurita("fig-1");
        verify(repository, never()).save(any());
        verify(notificacionService, never()).crear(any());
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw -q test -Dtest=SubastaServiceCancelTest`
Expected: FAIL de compilación ("cannot find symbol: method cancelarPorFigurita").

- [ ] **Step 3: Implementar en `SubastaService`**

Agregar imports si faltaran: `import java.util.Objects;` (ya hay `java.util.*`). Agregar el método (por ejemplo, después de `finalizar`):
```java
    /** Cancela (soft) las subastas activas cuya figurita es la dada y avisa a los ofertantes. */
    public void cancelarPorFigurita(String figuritaId) {
        for (Subasta subasta : repository.findByFiguritaId(figuritaId)) {
            subasta.setEstado(EstadoSubasta.CANCELADA);
            repository.save(subasta);

            String jugador = subasta.getFigurita() != null
                    && subasta.getFigurita().getFiguritaBase() != null
                    && subasta.getFigurita().getFiguritaBase().getJugador() != null
                    ? subasta.getFigurita().getFiguritaBase().getJugador().getNombre() : "la figurita";

            if (subasta.getOfertas() != null) {
                subasta.getOfertas().stream()
                        .map(Oferta::getUsuario)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toMap(Usuario::getId, u -> u, (a, b) -> a))
                        .values()
                        .forEach(u -> notificacionService.crear(Notificacion.builder()
                                .usuario(u)
                                .tipo("subasta")
                                .titulo("Subasta cancelada")
                                .mensaje("La subasta de " + jugador + " fue cancelada porque la figurita ya no está disponible")
                                .enlace("/subastas/" + subasta.getId())
                                .leida(false)
                                .fecha(LocalDateTime.now())
                                .build()));
            }
        }
    }
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw -q test -Dtest=SubastaServiceCancelTest`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/service/SubastaService.java backend/src/test/java/com/grupo3/tp/service/SubastaServiceCancelTest.java
git commit -m "feat(coleccion): SubastaService.cancelarPorFigurita (soft-cancel + notif ofertantes)"
```

---

### Task B4: `SolicitudDeIntercambioService.cancelarPorFigurita`

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/SolicitudDeIntercambioService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/SolicitudCancelPorFiguritaTest.java`

**Interfaces:**
- Produces: `void SolicitudDeIntercambioService.cancelarPorFigurita(String figuritaId)`.

- [ ] **Step 1: Escribir el test que falla**

`test/.../service/SolicitudCancelPorFiguritaTest.java`:
```java
package com.grupo3.tp.service;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SolicitudCancelPorFiguritaTest {

    @Mock private SolicitudDeIntercambioRepository repository;
    @Mock private NotificacionService notificacionService;
    @Mock private FiguritaService figuritaService;
    @Mock private IntercambioService intercambioService;
    @Mock private FiguritaPublicadaService publicadaService;

    private SolicitudDeIntercambioService service;

    private Usuario proponente;
    private Usuario duenio;

    @BeforeEach
    public void setUp() {
        service = new SolicitudDeIntercambioService(repository, notificacionService, figuritaService, intercambioService, publicadaService);
        proponente = Usuario.builder().id("user-prop").username("proponente").build();
        duenio = Usuario.builder().id("user-owner").username("duenio").build();
    }

    @Test
    public void cancelaSolicitudDondeLaFiguritaEsLaPedidaYAvisaAlProponente() {
        Figurita pedida = Figurita.builder().id("fig-1").owner(duenio).build();
        SolicitudDeIntercambio sol = SolicitudDeIntercambio.builder()
                .id("sol-1").usuario(proponente).figurita(pedida)
                .figuritasOfrecidas(List.of())
                .estado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE).build();
        when(repository.findPendientesByFiguritaId("fig-1")).thenReturn(List.of(sol));

        service.cancelarPorFigurita("fig-1");

        assertEquals(SolicitudDeIntercambio.EstadoSolicitud.CANCELADO, sol.getEstado());
        verify(repository).save(sol);
        verify(notificacionService).crear(argThat(n -> n.getUsuario() == proponente));
    }

    @Test
    public void cancelaSolicitudDondeLaFiguritaEsOfrecidaYAvisaAlDuenio() {
        Figurita pedida = Figurita.builder().id("fig-pedida").owner(duenio).build();
        Figurita ofrecida = Figurita.builder().id("fig-2").owner(proponente).build();
        SolicitudDeIntercambio sol = SolicitudDeIntercambio.builder()
                .id("sol-2").usuario(proponente).figurita(pedida)
                .figuritasOfrecidas(List.of(ofrecida))
                .estado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE).build();
        when(repository.findPendientesByFiguritaId("fig-2")).thenReturn(List.of(sol));

        service.cancelarPorFigurita("fig-2");

        assertEquals(SolicitudDeIntercambio.EstadoSolicitud.CANCELADO, sol.getEstado());
        verify(notificacionService).crear(argThat(n -> n.getUsuario() == duenio));
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw -q test -Dtest=SolicitudCancelPorFiguritaTest`
Expected: FAIL de compilación.

- [ ] **Step 3: Implementar en `SolicitudDeIntercambioService`**

Agregar imports `import java.time.LocalDateTime;` (ya está) y el método:
```java
    /** Cancela (soft) las solicitudes PENDIENTES que referencian la figurita y avisa a la contraparte. */
    public void cancelarPorFigurita(String figuritaId) {
        for (SolicitudDeIntercambio sol : repository.findPendientesByFiguritaId(figuritaId)) {
            sol.setEstado(SolicitudDeIntercambio.EstadoSolicitud.CANCELADO);
            repository.save(sol);

            boolean eraPedida = sol.getFigurita() != null && figuritaId.equals(sol.getFigurita().getId());
            Usuario destinatario = eraPedida
                    ? sol.getUsuario()
                    : (sol.getFigurita() != null ? sol.getFigurita().getOwner() : null);
            String enlace = eraPedida ? "/propuestas/enviadas" : "/propuestas/recibidas";

            if (destinatario != null) {
                notificacionService.crear(Notificacion.builder()
                        .usuario(destinatario)
                        .tipo("propuesta")
                        .titulo("Propuesta cancelada")
                        .mensaje("Una propuesta fue cancelada porque una figurita ya no está disponible")
                        .enlace(enlace)
                        .leida(false)
                        .fecha(LocalDateTime.now())
                        .build());
            }
        }
    }
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw -q test -Dtest=SolicitudCancelPorFiguritaTest`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/service/SolicitudDeIntercambioService.java backend/src/test/java/com/grupo3/tp/service/SolicitudCancelPorFiguritaTest.java
git commit -m "feat(coleccion): SolicitudDeIntercambioService.cancelarPorFigurita (soft-cancel + notif contraparte)"
```

---

### Task B5: `ColeccionService.liberarFigurita` + habilitar bajar cantidad (cascada)

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/ColeccionService.java`
- Modify: `backend/src/test/java/com/grupo3/tp/service/ColeccionServiceTest.java`

**Interfaces:**
- Consumes: `FiguritaPublicadaService.removeFiguritaFromPublications`, `SubastaService.cancelarPorFigurita`, `SolicitudDeIntercambioService.cancelarPorFigurita`, `FiguritaPublicadaRepository.findByFiguritaId`, `SubastaRepository.findByFiguritaId`, `SolicitudDeIntercambioRepository.findPendientesByFiguritaId`, `FiguritaService.eliminar`.

- [ ] **Step 1: Ampliar las dependencias de `ColeccionService`**

Reemplazar el bloque de campos + constructor por:
```java
    private final FiguritaService figuritaService;
    private final FiguritaBaseService figuritaBaseService;
    private final UsuarioService usuarioService;
    private final FaltanteRepository faltanteRepository;
    private final FiguritaPublicadaService publicadaService;
    private final SubastaService subastaService;
    private final SolicitudDeIntercambioService solicitudService;
    private final com.grupo3.tp.repository.FiguritaPublicadaRepository publicadaRepository;
    private final com.grupo3.tp.repository.SubastaRepository subastaRepository;
    private final com.grupo3.tp.repository.SolicitudDeIntercambioRepository solicitudRepository;

    public ColeccionService(FiguritaService figuritaService,
                            FiguritaBaseService figuritaBaseService,
                            UsuarioService usuarioService,
                            FaltanteRepository faltanteRepository,
                            FiguritaPublicadaService publicadaService,
                            SubastaService subastaService,
                            SolicitudDeIntercambioService solicitudService,
                            com.grupo3.tp.repository.FiguritaPublicadaRepository publicadaRepository,
                            com.grupo3.tp.repository.SubastaRepository subastaRepository,
                            com.grupo3.tp.repository.SolicitudDeIntercambioRepository solicitudRepository) {
        this.figuritaService = figuritaService;
        this.figuritaBaseService = figuritaBaseService;
        this.usuarioService = usuarioService;
        this.faltanteRepository = faltanteRepository;
        this.publicadaService = publicadaService;
        this.subastaService = subastaService;
        this.solicitudService = solicitudService;
        this.publicadaRepository = publicadaRepository;
        this.subastaRepository = subastaRepository;
        this.solicitudRepository = solicitudRepository;
    }
```

- [ ] **Step 2: Reemplazar la rama `cantidad < current` y agregar helpers**

En `setCantidad`, reemplazar el bloque:
```java
        } else if (cantidad < current) {
            // FASE B reemplaza esto por la cascada de liberación.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Reducir la cantidad todavía no está disponible");
        }
```
por:
```java
        } else if (cantidad < current) {
            int need = current - cantidad;
            List<Figurita> ordenadas = ordenarPorMenorCompromiso(mias);
            for (int i = 0; i < need; i++) {
                liberarFigurita(ordenadas.get(i).getId());
            }
        }
```
Y agregar, al final de la clase:
```java
    /** true si la copia está en alguna publicación, subasta activa o propuesta pendiente. */
    private boolean estaComprometida(String figuritaId) {
        return !publicadaRepository.findByFiguritaId(figuritaId).isEmpty()
                || !subastaRepository.findByFiguritaId(figuritaId).isEmpty()
                || !solicitudRepository.findPendientesByFiguritaId(figuritaId).isEmpty();
    }

    /** Ordena las copias dejando primero las no comprometidas (menor disrupción al liberar). */
    private List<Figurita> ordenarPorMenorCompromiso(List<Figurita> copias) {
        return copias.stream()
                .sorted(java.util.Comparator.comparing(f -> estaComprometida(f.getId())))
                .toList();
    }

    /** Desarma todos los compromisos de una copia (publicación/subasta/propuesta) y la borra. */
    public void liberarFigurita(String figuritaId) {
        publicadaService.removeFiguritaFromPublications(figuritaId);
        subastaService.cancelarPorFigurita(figuritaId);
        solicitudService.cancelarPorFigurita(figuritaId);
        figuritaService.eliminar(figuritaId);
    }
```

- [ ] **Step 3: Actualizar `ColeccionServiceTest`**

En `ColeccionServiceTest.java`:
- Agregar mocks:
```java
    @Mock private FiguritaPublicadaService publicadaService;
    @Mock private SubastaService subastaService;
    @Mock private SolicitudDeIntercambioService solicitudService;
    @Mock private com.grupo3.tp.repository.FiguritaPublicadaRepository publicadaRepository;
    @Mock private com.grupo3.tp.repository.SubastaRepository subastaRepository;
    @Mock private com.grupo3.tp.repository.SolicitudDeIntercambioRepository solicitudRepository;
```
- Cambiar la construcción en `setUp` a:
```java
        service = new ColeccionService(figuritaService, figuritaBaseService, usuarioService, faltanteRepository,
                publicadaService, subastaService, solicitudService,
                publicadaRepository, subastaRepository, solicitudRepository);
```
- REEMPLAZAR el test `setCantidadMenorLanza409EnFaseA` por:
```java
    @Test
    public void setCantidadMenorLiberaLasCopiasSobrantesNoComprometidasPrimero() {
        Figurita comprometida = fig("f-comprometida", base1, juan);
        Figurita libre = fig("f-libre", base1, juan);
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(comprometida, libre)); // current = 2
        // "comprometida" está en una subasta; "libre" no está en ningún lado.
        when(subastaRepository.findByFiguritaId("f-comprometida"))
                .thenReturn(List.of(Subasta.builder().id("s").build()));
        when(publicadaRepository.findByFiguritaId(any())).thenReturn(List.of());
        when(subastaRepository.findByFiguritaId("f-libre")).thenReturn(List.of());
        when(solicitudRepository.findPendientesByFiguritaId(any())).thenReturn(List.of());

        service.setCantidad("juan", "base-1", 1); // baja de 2 a 1 => libera 1

        // Debe liberar primero la copia libre.
        verify(figuritaService).eliminar("f-libre");
        verify(figuritaService, never()).eliminar("f-comprometida");
    }
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd backend && ./mvnw -q test -Dtest=ColeccionServiceTest`
Expected: PASS (8 tests; el reemplazado ahora verifica la cascada).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/service/ColeccionService.java backend/src/test/java/com/grupo3/tp/service/ColeccionServiceTest.java
git commit -m "feat(coleccion): cascada de liberación al bajar cantidad (uncommitted-first)"
```

---

### Task B6: Frontend — render de estados `CANCELADA` / `CANCELADO`

**Files:**
- Modify: `frontend/src/hooks/useSubastas.ts` (union +CANCELADA)
- Modify: `frontend/src/pages/subastas/components/AuctionCard.tsx`, `frontend/src/pages/subastas/MiasPage.tsx`
- Modify: `frontend/src/pages/propuestas/EnviadasPage.tsx`, `frontend/src/pages/propuestas/RecibidasPage.tsx`

- [ ] **Step 1: Ampliar la union de estado de subasta**

En `src/hooks/useSubastas.ts`, cambiar:
```typescript
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA';
```
por:
```typescript
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
```

- [ ] **Step 2: `AuctionCard` — estilo para CANCELADA**

En `AuctionCard.tsx`, dentro de `statusStyle`, agregar la entrada:
```typescript
  'CANCELADA': { border: '#e5e7eb', bg: '#f9fafb' },
```
Y cambiar la union local de `estado` (línea ~14) a incluir `| 'CANCELADA'`.

- [ ] **Step 3: `MiasPage` — badge de canceladas**

En `MiasPage.tsx`, después de `const finished = auctions.filter(a => a.estado === 'FINALIZADA');` agregar:
```typescript
  const cancelled = auctions.filter(a => a.estado === 'CANCELADA');
```
Y después del bloque `{finished.length > 0 && (...)}` agregar:
```tsx
{cancelled.length > 0 && (
  <span
    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
    style={{ background: '#9ca3af15', color: '#9ca3af' }}
  >
    Cancelada · {cancelled.length}
  </span>
)}
```

- [ ] **Step 4: Propuestas — casos CANCELADO**

En `EnviadasPage.tsx` y `RecibidasPage.tsx`, agregar en el `switch` de `getStatusColor` el caso:
```typescript
    case "CANCELADO":
      return "text-muted";
```
y en `getStatusText`:
```typescript
    case "CANCELADO":
      return "🚫 Cancelado";
```

- [ ] **Step 5: Verificar build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: OK.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useSubastas.ts frontend/src/pages/subastas/ frontend/src/pages/propuestas/
git commit -m "feat(coleccion): render de estados CANCELADA/CANCELADO en subastas y propuestas"
```

---

# FASE C — Matching desde la wishlist (US4 + US11)

### Task C1: US4 — `SugerenciaService` matchea contra la wishlist

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/SugerenciaService.java`
- Modify: `backend/src/test/java/com/grupo3/tp/service/SugerenciaServiceTest.java`

**Interfaces:**
- Consumes: `FaltanteRepository.findAll()`.

- [ ] **Step 1: Actualizar `SugerenciaService`**

- Inyectar `FaltanteRepository`: agregar el campo `private final FaltanteRepository faltanteRepository;`, el import `import com.grupo3.tp.repository.FaltanteRepository;` y el import `import com.grupo3.tp.models.Faltante;`, y ampliar el constructor a recibir y asignar `faltanteRepository`.
- En `regenerarTodas()`, después de construir `repetidas` y antes de `LocalDateTime ahora = ...`, construir el mapa de wishlist:
```java
        // owner id -> set de baseIds que el usuario DECLARÓ que le faltan (wishlist)
        Map<String, Set<String>> wishlist = new HashMap<>();
        for (Faltante f : faltanteRepository.findAll()) {
            if (f.getUsuarioId() != null && f.getFiguritaBaseId() != null) {
                wishlist.computeIfAbsent(f.getUsuarioId(), k -> new HashSet<>()).add(f.getFiguritaBaseId());
            }
        }
```
- Reemplazar el cálculo de `aRecibir`/`aOfrecer` dentro del loop de `v` por:
```java
                Set<String> wishU = wishlist.getOrDefault(u.getId(), Set.of());
                Set<String> wishV = wishlist.getOrDefault(v.getId(), Set.of());

                List<FiguritaResponseDTO> aRecibir = repV.entrySet().stream()
                        .filter(en -> wishU.contains(en.getKey()) && !ownedU.contains(en.getKey()))
                        .map(Map.Entry::getValue).toList();
                List<FiguritaResponseDTO> aOfrecer = repU.entrySet().stream()
                        .filter(en -> wishV.contains(en.getKey()) && !ownedV.contains(en.getKey()))
                        .map(Map.Entry::getValue).toList();
```

- [ ] **Step 2: Actualizar `SugerenciaServiceTest` (matching por wishlist)**

En `SugerenciaServiceTest.java`:
- Agregar `@Mock private FaltanteRepository faltanteRepository;` (import `com.grupo3.tp.repository.FaltanteRepository` y `com.grupo3.tp.models.Faltante`). Como usa `@InjectMocks`, Mockito lo inyecta al nuevo constructor automáticamente.
- En `generaSugerenciaBidireccional`, antes de `service.regenerarTodas();`, declarar las wishlists (juan quiere base-2; maria quiere base-1):
```java
        when(faltanteRepository.findAll()).thenReturn(List.of(
                Faltante.builder().usuarioId("user-1").figuritaBaseId("base-2").build(),
                Faltante.builder().usuarioId("user-2").figuritaBaseId("base-1").build()
        ));
```
- En `noGeneraSiUnLadoEstaVacio`, agregar `when(faltanteRepository.findAll()).thenReturn(List.of());` antes de `service.regenerarTodas();` (sin wishlist → no hay match; la aserción `never().saveAll` sigue válida).
- Los tests `obtenerPorUsuario...` no usan `regenerarTodas` y no requieren stub de `faltanteRepository` (lenient por defecto en MockitoExtension: los stubs no usados no fallan sólo si no se declaran; no agregar stubs innecesarios).

- [ ] **Step 3: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw -q test -Dtest=SugerenciaServiceTest`
Expected: PASS (4 tests; el matching ahora usa la wishlist).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/service/SugerenciaService.java backend/src/test/java/com/grupo3/tp/service/SugerenciaServiceTest.java
git commit -m "feat(coleccion): US4 matchea 'mis repetidas' contra la wishlist declarada"
```

---

### Task C2: US11 — notificación proactiva desde la wishlist

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/repository/UsuarioRepositoryImpl.java`

**Interfaces:**
- Mantiene la firma `List<Usuario> findUsuariosQueLesFaltaFigurita(String figuritaBaseId)` (los callers `SubastaService.crear` y `FiguritaPublicadaService.publicar` no cambian); cambia su semántica a "usuarios que declararon esa base en su wishlist".

- [ ] **Step 1: Reescribir el método**

Reemplazar el cuerpo de `findUsuariosQueLesFaltaFigurita` por una consulta a la colección `faltantes`:
```java
    @Override
    public List<Usuario> findUsuariosQueLesFaltaFigurita(String figuritaBaseId) {
        // Usuarios que DECLARARON esta base en su wishlist (colección "faltantes").
        // Faltante guarda figuritaBaseId y usuarioId como String.
        List<String> usuarioIds = mongoTemplate.findDistinct(
                Query.query(Criteria.where("figuritaBaseId").is(figuritaBaseId)),
                "usuarioId", "faltantes", com.grupo3.tp.models.Faltante.class, String.class);

        if (usuarioIds.isEmpty()) {
            return List.of();
        }
        List<ObjectId> objectIds = usuarioIds.stream().map(ObjectId::new).toList();
        return mongoTemplate.find(
                Query.query(Criteria.where("_id").in(objectIds)), Usuario.class);
    }
```
(No hace falta cambiar imports: `ObjectId`, `MongoTemplate`, `Criteria`, `Query`, `List` ya están importados.)

- [ ] **Step 2: Compilar**

Run: `cd backend && ./mvnw -q -DskipTests compile`
Expected: BUILD SUCCESS.

> **Nota:** esta query Mongo NO se testea unitariamente (necesita Mongo vivo) — se valida en la verificación E2E de la Fase D (publicar una base que otro usuario declaró faltante → llega notificación).

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/repository/UsuarioRepositoryImpl.java
git commit -m "feat(coleccion): US11 notifica según la wishlist declarada (no el derivado)"
```

---

# FASE D — Verificación integral + deploy

### Task D1: Suite completa backend

- [ ] **Step 1: Correr toda la suite backend**

Run: `cd backend && ./mvnw test`
Expected: los tests nuevos (`ColeccionServiceTest`, `SubastaServiceCancelTest`, `SolicitudCancelPorFiguritaTest`, `SugerenciaServiceTest`) en verde. Fallos preexistentes conocidos (requieren Mongo local / bugs viejos en `SolicitudDe(l)IntercambioServiceTest`, `OfertaServiceTest`) NO deben aumentar en número respecto del baseline. Si aparece un fallo NUEVO en un test que no tocamos, investigarlo (regresión) antes de seguir.

- [ ] **Step 2: Registrar el resultado**

Anotar en el mensaje de progreso: total tests, verdes, y la lista de fallos con su causa (preexistente vs nuevo).

---

### Task D2: Build + lint + tests frontend

- [ ] **Step 1: Build, lint y tests**

Run: `cd frontend && npm run build && npm run lint && npm run test`
Expected: build OK, lint sin errores nuevos, vitest en verde.

---

### Task D3: Verificación E2E (Puppeteer) del flujo real

**Objetivo:** validar contra la app corriendo (backend + Mongo + frontend) el flujo completo, cubriendo lo que los unit tests no cubren (queries Mongo, arranque del contexto con los 2 controllers, notificación US11).

- [ ] **Step 1: Levantar el stack local**

Preferido: `docker compose up --build -d` desde la raíz (backend :8080, front :80). Si el puerto 80 está ocupado (Apache local), usar el front en modo dev: `cd frontend && npm run dev` (Vite) apuntando `VITE_API_URL=http://localhost:8080`, con el backend por Docker o `cd backend && ./mvnw spring-boot:run`. Sembrar datos: `POST /api/admin/seed-demo` (admin/adminpass123) o registrar 2 usuarios nuevos.

- [ ] **Step 2: Smoke con el skill de verificación / Puppeteer**

Usar el skill `verify` (o Puppeteer MCP) para, logueado como un usuario demo:
  1. **Repetidas/Todas → "+ Agregar Figurita"** → buscar por número, elegir una figu, poner cantidad 3 → confirmar que aparece con `x3` en la colección.
  2. **Faltantes → "+ Agregar Figurita"** → elegir una base que NO poseés → aparece en la lista de faltantes; **Quitar** → desaparece.
  3. **Rechazo**: intentar agregar a faltantes una base que ya poseés → mensaje "Ya tenés esta figurita".
  4. **Cascada**: subastar una repetida; luego en la colección bajar la cantidad de esa base por debajo de las copias comprometidas → la subasta pasa a **CANCELADA** y (con un ofertante) llega la notificación.
  5. **US4/US11**: con 2 usuarios cuyas repetidas/faltantes se complementan, correr `POST /api/sugerencias/regenerar` (admin) → aparece la sugerencia; publicar una base que el otro declaró faltante → le llega la notificación.

- [ ] **Step 2b: Si algo falla**

Invocar `superpowers:systematic-debugging`, corregir, re-correr los unit tests afectados y repetir el smoke. No avanzar a deploy con el smoke en rojo.

---

### Task D4: Commit final, push y deploy

> Requiere el pedido explícito del usuario (ya dado). Seguir la memoria `project_aws_deploy.md` para los specifics de EC2.

- [ ] **Step 1: Estado limpio y merge a master**

Si se trabajó en worktree/rama: `git status` limpio, todos los commits de arriba presentes. Volver a `master`, `git merge` (o fast-forward) de la rama de trabajo.

- [ ] **Step 2: Push**

Run: `git push origin master`
Expected: push OK.

- [ ] **Step 3: Deploy a EC2 (prod)**

Seguir el proceso documentado (memoria/README §Online AWS): SSH al EC2 (EIP 34.195.221.240), `git pull`, `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d`. Verificar `https://tacs-g3-figuritas.dev/` responde 200 y probar el flujo de "Agregar Figurita" en prod. **Nota:** la colección `faltantes` arranca vacía en prod → los faltantes derivados viejos desaparecen; si se quiere data de demo con wishlist, correr el seed correspondiente (o dejar que los usuarios declaren). Confirmar con el usuario antes de re-seedear (acción destructiva).

- [ ] **Step 4: Actualizar memoria**

Registrar en memoria del agente: feature deployado, commit(s), y que `faltantes` ahora es wishlist declarada (US4/US11 dependen de ella).

---

## Self-Review (contra el spec)

**Cobertura del spec:**
- Wishlist `Faltante` → Task A1. ✓
- `PUT set-cantidad` (set total, raise) → A3/A4; bajar con cascada → B5. ✓
- Endpoints wishlist (POST/DELETE/GET repurpose) → A4. ✓
- Modal 2 modos + botones + quitar → A5/A6. ✓
- Estados CANCELADA/CANCELADO → B1; reverse-lookups → B2; cancelarPorFigurita → B3/B4; liberarFigurita + uncommitted-first → B5; render front → B6. ✓
- US4 desde wishlist → C1; US11 desde wishlist → C2. ✓
- Auth self-or-admin → A4. ✓
- Verificación (tests + E2E) → D1–D3; commit/push/deploy → D4. ✓

**Placeholder scan:** sin TBD/TODO; todo el código nuevo está completo; los edits citan el texto exacto a reemplazar.

**Type consistency:** `setCantidad`/`agregarFaltante`/`quitarFaltante`/`listarFaltantes` idénticos entre A3 (impl), A4 (controller), y tests. `cancelarPorFigurita` idéntico en B3/B4/B5. `findByFiguritaId`/`findPendientesByFiguritaId` idénticos entre B2 (decl) y B3/B5 (uso). `Faltante` builder (`usuarioId`, `figuritaBaseId`, `figuritaBase`, `fecha`) idéntico en A1/A3/C1. DTOs `FiguritaResponseDTO`/`FiguritaBaseDTO` usados con el orden exacto de constructor verificado.

**Scope:** foco único (construir colección + wishlist + su matching). Ejecutable en un plan.
