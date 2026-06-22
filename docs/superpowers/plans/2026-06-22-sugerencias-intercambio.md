# Sugerencias de Intercambio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Implementar US4 — sugerencias automáticas de intercambio bidireccional, persistidas y regeneradas por job diario, con página frontend que permite prearmar una propuesta.

**Architecture:** Backend en capas (Controller→Service→Repository). `SugerenciaService` calcula el match bidireccional en memoria a partir de `figuritaRepository.findAll()` + `usuarioRepository.findAll()`, y persiste documentos `Sugerencia` (uno por contraparte viable). Un `SugerenciaScheduler` (`@Scheduled` cron 3 AM) llama a `regenerarTodas()`. Frontend: página `/sugerencias`, prefill de propuesta y wiring del Dashboard.

**Tech Stack:** Java 21, Spring Boot 4, Spring Data MongoDB, Lombok, JUnit 5 + Mockito; React 19 + TS.

## Global Constraints

- `@EnableScheduling` ya está presente en `TpApplication` — NO re-agregar.
- Tests backend: JUnit 5 + Mockito puro (`@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks`), sin `@SpringBootTest` (no requieren Mongo). Constructores de modelos de referencia: `Seleccion(id, nombre, abreviatura)`, `Equipo(id, nombre)`, `CategoriaFigurita(id, nombre)`, `Jugador(id, nombre)`.
- No commitear (instrucción permanente del usuario).
- Frontend: instancia `api`; verificación `npm run build` (gate) + lint sin errores nuevos.
- Endpoints nuevos quedan bajo el `anyRequest().authenticated()` existente; el `POST /regenerar` es ADMIN.

## Decisión de diseño (desvío documentado del spec)

El spec proponía `Sugerencia` con `@DocumentReference` a `Usuario` y `List<Figurita>`. Se cambia a:
- `usuarioId` **String plano** → `findByUsuarioId` / `deleteByUsuarioId` derivados funcionan sin custom impl.
- `contraparteId` + `contraparteNombre` denormalizados.
- `figuritasARecibir` / `figuritasAOfrecer` como **`List<FiguritaResponseDTO>` embebidos** (snapshots).

Motivo: evita el patrón `MongoTemplate`+`ObjectId` para consultar por referencia, elimina el riesgo de serialización de refs lazy, y da lectura de un solo documento. Obsolescencia acotada por la regeneración diaria.

## File Structure

**Backend — crear:**
- `models/Sugerencia.java` (reemplaza el stub).
- `repository/SugerenciaRepository.java`.
- `service/SugerenciaService.java`.
- `controller/SugerenciaController.java`.
- `dtos/SugerenciaResponseDTO.java`.
- `scheduler/SugerenciaScheduler.java`.
- `src/test/java/com/grupo3/tp/service/SugerenciaServiceTest.java`.

**Backend — modificar:**
- `models/GestionadorSugerencias.java` → eliminar.
- `controller/UsuarioController.java` → `GET /{userName}/sugerencias` + inyectar `SugerenciaService`.

**Frontend — crear:**
- `src/pages/sugerencias/SugerenciasPage.tsx`.

**Frontend — modificar:**
- `src/router/router.tsx` → ruta `/sugerencias`.
- `src/layouts/MainLayout.tsx` → nav "Sugerencias" + icono.
- `src/pages/propuestas/NuevaPage.tsx` → pre-tildar ofrecidas por base id.
- `src/pages/home/DashboardPage.tsx` → sección real de sugerencias.

---

### Task 1: Modelo `Sugerencia` + DTO + Repository

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/models/Sugerencia.java`
- Create: `backend/src/main/java/com/grupo3/tp/dtos/SugerenciaResponseDTO.java`
- Create: `backend/src/main/java/com/grupo3/tp/repository/SugerenciaRepository.java`
- Delete: `backend/src/main/java/com/grupo3/tp/models/GestionadorSugerencias.java`

**Interfaces:**
- Produces: `Sugerencia { id, usuarioId, contraparteId, contraparteNombre, List<FiguritaResponseDTO> figuritasARecibir, figuritasAOfrecer, LocalDateTime generadaEn }`; `SugerenciaResponseDTO { contraparteId, contraparteNombre, figuritasARecibir, figuritasAOfrecer }`; `SugerenciaRepository.findByUsuarioId(String)`, `.deleteByUsuarioId(String)`.

- [ ] **Step 1: Reescribir `Sugerencia.java`**

```java
package com.grupo3.tp.models;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "sugerencias")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sugerencia {
    @Id
    private String id;
    /** Usuario al que se le sugiere el intercambio. */
    private String usuarioId;
    private String contraparteId;
    private String contraparteNombre;
    /** Repetidas de la contraparte que al usuario le faltan (snapshot). */
    private List<FiguritaResponseDTO> figuritasARecibir;
    /** Repetidas del usuario que a la contraparte le faltan (snapshot). */
    private List<FiguritaResponseDTO> figuritasAOfrecer;
    private LocalDateTime generadaEn;
}
```

- [ ] **Step 2: Crear `SugerenciaResponseDTO.java`**

```java
package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SugerenciaResponseDTO {
    private String contraparteId;
    private String contraparteNombre;
    private List<FiguritaResponseDTO> figuritasARecibir;
    private List<FiguritaResponseDTO> figuritasAOfrecer;
}
```

- [ ] **Step 3: Crear `SugerenciaRepository.java`**

```java
package com.grupo3.tp.repository;

import com.grupo3.tp.models.Sugerencia;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SugerenciaRepository extends MongoRepository<Sugerencia, String> {
    List<Sugerencia> findByUsuarioId(String usuarioId);
    void deleteByUsuarioId(String usuarioId);
}
```

- [ ] **Step 4: Eliminar `GestionadorSugerencias.java`** (stub absorbido por el service).

- [ ] **Step 5: Verificar compilación** — `cd backend && ./mvnw -q -DskipTests compile`. Esperado: BUILD SUCCESS (puede fallar si quedan referencias al stub; no debería haber).

---

### Task 2: `SugerenciaService` (matching bidireccional + regeneración) con tests TDD

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/service/SugerenciaService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/SugerenciaServiceTest.java`

**Interfaces:**
- Consumes: `SugerenciaRepository`, `UsuarioRepository.findAll()`, `FiguritaRepository.findAll()`.
- Produces: `SugerenciaService.regenerarTodas(): void`, `obtenerPorUsuario(String usuarioId): List<SugerenciaResponseDTO>`.

- [ ] **Step 1: Escribir el test `SugerenciaServiceTest.java`** (match bidireccional, sin match si un lado vacío, auto-exclusión, reemplazo)

```java
package com.grupo3.tp.service;

import com.grupo3.tp.dtos.SugerenciaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FiguritaRepository;
import com.grupo3.tp.repository.SugerenciaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SugerenciaServiceTest {

    @Mock private SugerenciaRepository sugerenciaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private FiguritaRepository figuritaRepository;
    @InjectMocks private SugerenciaService service;

    private Usuario juan;
    private Usuario maria;
    private FiguritaBase base1;
    private FiguritaBase base2;

    private Figurita fig(String id, FiguritaBase base, Usuario owner) {
        return Figurita.builder().id(id).figuritaBase(base).owner(owner).build();
    }

    @BeforeEach
    public void setUp() {
        juan = Usuario.builder().id("user-1").username("juan").build();
        maria = Usuario.builder().id("user-2").username("maria").build();
        base1 = FiguritaBase.builder().id("base-1").numero(1)
                .seleccion(new Seleccion("sel-1", "Argentina", "ARG"))
                .equipo(new Equipo("eq-1", "Equipo"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-1", "Messi")).build();
        base2 = FiguritaBase.builder().id("base-2").numero(2)
                .seleccion(new Seleccion("sel-1", "Argentina", "ARG"))
                .equipo(new Equipo("eq-1", "Equipo"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-2", "Di Maria")).build();
    }

    @Test
    public void generaSugerenciaBidireccional() {
        // juan: 2x base1 (repetida), no base2. maria: 2x base2 (repetida), no base1.
        when(usuarioRepository.findAll()).thenReturn(List.of(juan, maria));
        when(figuritaRepository.findAll()).thenReturn(List.of(
                fig("f1", base1, juan), fig("f2", base1, juan),
                fig("f3", base2, maria), fig("f4", base2, maria)
        ));

        service.regenerarTodas();

        ArgumentCaptor<List<Sugerencia>> captor = ArgumentCaptor.forClass(List.class);
        // se guarda para juan y para maria (1 saveAll por usuario con candidatos)
        verify(sugerenciaRepository, times(2)).saveAll(captor.capture());
        verify(sugerenciaRepository).deleteByUsuarioId("user-1");
        verify(sugerenciaRepository).deleteByUsuarioId("user-2");

        List<Sugerencia> guardadasJuan = captor.getAllValues().stream()
                .flatMap(List::stream).filter(s -> s.getUsuarioId().equals("user-1")).toList();
        assertEquals(1, guardadasJuan.size());
        Sugerencia s = guardadasJuan.get(0);
        assertEquals("user-2", s.getContraparteId());
        assertEquals("maria", s.getContraparteNombre());
        assertEquals(1, s.getFiguritasARecibir().size());
        assertEquals("base-2", s.getFiguritasARecibir().get(0).getFiguritaBaseId());
        assertEquals(1, s.getFiguritasAOfrecer().size());
        assertEquals("base-1", s.getFiguritasAOfrecer().get(0).getFiguritaBaseId());
    }

    @Test
    public void noGeneraSiUnLadoEstaVacio() {
        // juan: 2x base1. maria: 1x base1 (sin repetida y ya tiene base1 -> juan no le ofrece nada).
        when(usuarioRepository.findAll()).thenReturn(List.of(juan, maria));
        when(figuritaRepository.findAll()).thenReturn(List.of(
                fig("f1", base1, juan), fig("f2", base1, juan),
                fig("f3", base1, maria)
        ));

        service.regenerarTodas();

        // nunca se guarda ninguna sugerencia (saveAll no se llama; delete sí por usuario)
        verify(sugerenciaRepository, never()).saveAll(any());
        verify(sugerenciaRepository).deleteByUsuarioId("user-1");
        verify(sugerenciaRepository).deleteByUsuarioId("user-2");
    }

    @Test
    public void obtenerPorUsuarioMapeaADTO() {
        Sugerencia s = Sugerencia.builder()
                .usuarioId("user-1").contraparteId("user-2").contraparteNombre("maria")
                .figuritasARecibir(List.of()).figuritasAOfrecer(List.of()).build();
        when(sugerenciaRepository.findByUsuarioId("user-1")).thenReturn(List.of(s));

        List<SugerenciaResponseDTO> dtos = service.obtenerPorUsuario("user-1");

        assertEquals(1, dtos.size());
        assertEquals("maria", dtos.get(0).getContraparteNombre());
        verify(sugerenciaRepository).findByUsuarioId("user-1");
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla** — `cd backend && ./mvnw -q -Dtest=SugerenciaServiceTest test`. Esperado: FAIL (no compila: `SugerenciaService` no existe).

- [ ] **Step 3: Implementar `SugerenciaService.java`**

```java
package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.SugerenciaResponseDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.Sugerencia;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.FiguritaRepository;
import com.grupo3.tp.repository.SugerenciaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SugerenciaService {

    private final SugerenciaRepository sugerenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final FiguritaRepository figuritaRepository;

    public SugerenciaService(SugerenciaRepository sugerenciaRepository,
                             UsuarioRepository usuarioRepository,
                             FiguritaRepository figuritaRepository) {
        this.sugerenciaRepository = sugerenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.figuritaRepository = figuritaRepository;
    }

    /** Sugerencias persistidas del usuario, mapeadas a DTO. */
    public List<SugerenciaResponseDTO> obtenerPorUsuario(String usuarioId) {
        return sugerenciaRepository.findByUsuarioId(usuarioId).stream()
                .map(s -> new SugerenciaResponseDTO(
                        s.getContraparteId(), s.getContraparteNombre(),
                        s.getFiguritasARecibir(), s.getFiguritasAOfrecer()))
                .toList();
    }

    /**
     * Recalcula y reemplaza las sugerencias de todos los usuarios. Para cada par (U, V),
     * crea una sugerencia si V tiene repetidas que a U le faltan Y U tiene repetidas que a V le faltan.
     */
    public void regenerarTodas() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        List<Figurita> todas = figuritaRepository.findAll();

        // owner id -> figuritas
        Map<String, List<Figurita>> porOwner = todas.stream()
                .filter(f -> f.getOwner() != null && f.getFiguritaBase() != null)
                .collect(Collectors.groupingBy(f -> f.getOwner().getId()));

        // owner id -> bases que posee
        Map<String, Set<String>> basesPoseidas = new HashMap<>();
        // owner id -> (baseId -> instancia representativa como DTO) de las repetidas (count>1)
        Map<String, Map<String, FiguritaResponseDTO>> repetidas = new HashMap<>();

        for (Map.Entry<String, List<Figurita>> e : porOwner.entrySet()) {
            Map<String, List<Figurita>> porBase = e.getValue().stream()
                    .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()));
            basesPoseidas.put(e.getKey(), new HashSet<>(porBase.keySet()));
            Map<String, FiguritaResponseDTO> rep = new HashMap<>();
            for (Map.Entry<String, List<Figurita>> be : porBase.entrySet()) {
                if (be.getValue().size() > 1) {
                    rep.put(be.getKey(), toDTO(be.getValue().get(0)));
                }
            }
            repetidas.put(e.getKey(), rep);
        }

        LocalDateTime ahora = LocalDateTime.now();

        for (Usuario u : usuarios) {
            Set<String> ownedU = basesPoseidas.getOrDefault(u.getId(), Set.of());
            Map<String, FiguritaResponseDTO> repU = repetidas.getOrDefault(u.getId(), Map.of());

            List<Sugerencia> candidatos = new ArrayList<>();
            for (Usuario v : usuarios) {
                if (v.getId().equals(u.getId())) continue;
                Set<String> ownedV = basesPoseidas.getOrDefault(v.getId(), Set.of());
                Map<String, FiguritaResponseDTO> repV = repetidas.getOrDefault(v.getId(), Map.of());

                List<FiguritaResponseDTO> aRecibir = repV.entrySet().stream()
                        .filter(en -> !ownedU.contains(en.getKey()))
                        .map(Map.Entry::getValue).toList();
                List<FiguritaResponseDTO> aOfrecer = repU.entrySet().stream()
                        .filter(en -> !ownedV.contains(en.getKey()))
                        .map(Map.Entry::getValue).toList();

                if (!aRecibir.isEmpty() && !aOfrecer.isEmpty()) {
                    candidatos.add(Sugerencia.builder()
                            .usuarioId(u.getId())
                            .contraparteId(v.getId())
                            .contraparteNombre(v.getUsername())
                            .figuritasARecibir(aRecibir)
                            .figuritasAOfrecer(aOfrecer)
                            .generadaEn(ahora)
                            .build());
                }
            }
            sugerenciaRepository.deleteByUsuarioId(u.getId());
            if (!candidatos.isEmpty()) {
                sugerenciaRepository.saveAll(candidatos);
            }
        }
    }

    private FiguritaResponseDTO toDTO(Figurita f) {
        return new FiguritaResponseDTO(
                f.getId(),
                f.getFiguritaBase().getNumero(),
                f.getFiguritaBase().getId(),
                1,
                f.getFiguritaBase().getJugador().getNombre(),
                f.getFiguritaBase().getSeleccion().getNombre(),
                f.getFiguritaBase().getEquipo().getNombre(),
                f.getFiguritaBase().getCategoria().getNombre(),
                f.getOwner().getId(),
                f.getOwner().getUsername()
        );
    }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa** — `cd backend && ./mvnw -q -Dtest=SugerenciaServiceTest test`. Esperado: PASS (3 tests).

---

### Task 3: Scheduler + Controller + endpoint GET en UsuarioController

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/scheduler/SugerenciaScheduler.java`
- Create: `backend/src/main/java/com/grupo3/tp/controller/SugerenciaController.java`
- Modify: `backend/src/main/java/com/grupo3/tp/controller/UsuarioController.java`

**Interfaces:**
- Consumes: `SugerenciaService`.
- Produces: `POST /api/sugerencias/regenerar` (ADMIN); `GET /api/usuarios/{userName}/sugerencias`.

- [ ] **Step 1: Crear `SugerenciaScheduler.java`** (cron 3 AM, configurable)

```java
package com.grupo3.tp.scheduler;

import com.grupo3.tp.service.SugerenciaService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SugerenciaScheduler {

    private final SugerenciaService sugerenciaService;

    public SugerenciaScheduler(SugerenciaService sugerenciaService) {
        this.sugerenciaService = sugerenciaService;
    }

    /** Regenera las sugerencias una vez al día (3 AM por defecto, configurable). */
    @Scheduled(cron = "${sugerencias.cron:0 0 3 * * *}", zone = "${sugerencias.zone:America/Argentina/Buenos_Aires}")
    public void regenerarDiariamente() {
        sugerenciaService.regenerarTodas();
    }
}
```

- [ ] **Step 2: Crear `SugerenciaController.java`** (endpoint manual ADMIN para testing)

```java
package com.grupo3.tp.controller;

import com.grupo3.tp.service.SugerenciaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sugerencias")
public class SugerenciaController {

    private final SugerenciaService sugerenciaService;

    public SugerenciaController(SugerenciaService sugerenciaService) {
        this.sugerenciaService = sugerenciaService;
    }

    /** Dispara la regeneración manual (para testing/demo, sin esperar al job diario). */
    @PostMapping("/regenerar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> regenerar() {
        sugerenciaService.regenerarTodas();
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 3: Verificar que `@PreAuthorize` está habilitado** — Leer `configs/SecurityConfig.java`. Debe existir `@EnableMethodSecurity` (lo usan los endpoints admin). Si no estuviera, agregarlo. (El AdminController ya usa `@PreAuthorize`, así que debería estar.)

- [ ] **Step 4: Modificar `UsuarioController.java`** — inyectar `SugerenciaService` y agregar el GET.

En el constructor y campos:
```java
    private final SugerenciaService sugerenciaService;

    public UsuarioController(UsuarioService service, FiguritaService figuritaService, SugerenciaService sugerenciaService) {
        this.service = service;
        this.figuritaService = figuritaService;
        this.sugerenciaService = sugerenciaService;
    }
```
Nuevo endpoint (junto a los otros `@GetMapping`):
```java
    @GetMapping("/{userName}/sugerencias")
    public ResponseEntity<List<com.grupo3.tp.dtos.SugerenciaResponseDTO>> getSugerencias(@PathVariable String userName) {
        Usuario usuario = service.loadUserByUsername(userName);
        return ResponseEntity.ok(sugerenciaService.obtenerPorUsuario(usuario.getId()));
    }
```
(Agregar `import com.grupo3.tp.service.SugerenciaService;` y, opcional, `import com.grupo3.tp.dtos.SugerenciaResponseDTO;` para no usar el FQN.)

- [ ] **Step 5: Verificar compilación + todos los tests** — `cd backend && ./mvnw -q test -Dtest=SugerenciaServiceTest` (unit) y `./mvnw -q -DskipTests package` (compila todo). Esperado: BUILD SUCCESS.

---

### Task 4: Frontend — `SugerenciasPage` + ruta + sidebar

**Files:**
- Create: `frontend/src/pages/sugerencias/SugerenciasPage.tsx`
- Modify: `frontend/src/router/router.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx`

**Interfaces:**
- Consumes: `GET /api/usuarios/{username}/sugerencias` → `SugerenciaResponseDTO[]`.

- [ ] **Step 1: Crear `SugerenciasPage.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';

interface FiguritaResponseDTO {
  id: string;
  figuritaBaseId: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  count: number;
  ownerId: string;
  ownerName: string;
}

interface SugerenciaResponseDTO {
  contraparteId: string;
  contraparteNombre: string;
  figuritasARecibir: FiguritaResponseDTO[];
  figuritasAOfrecer: FiguritaResponseDTO[];
}

export default function SugerenciasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sugerencias, setSugerencias] = useState<SugerenciaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/sugerencias`)
      .then((res) => { setSugerencias(res.data || []); setLoading(false); })
      .catch((error) => { console.error('Error fetching sugerencias:', error); setLoading(false); });
  }, [user?.username]);

  const proponer = (s: SugerenciaResponseDTO, f: FiguritaResponseDTO) => {
    navigate('/propuestas/nueva', {
      state: {
        figuritaSeleccionada: f,
        figuritasOfrecidasBaseIds: s.figuritasAOfrecer.map((x) => x.figuritaBaseId),
      },
    });
  };

  if (loading) return <div className="page-enter"><p className="text-text">Cargando sugerencias...</p></div>;

  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-text mb-1">Sugerencias de Intercambio</h1>
      <p className="text-sm text-muted mb-6">Intercambios posibles con otros usuarios. Se actualizan a diario.</p>

      {sugerencias.length === 0 ? (
        <p className="text-muted">No tenés sugerencias por ahora.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {sugerencias.map((s) => (
            <div key={s.contraparteId} className="bg-surface border border-border rounded-lg p-5">
              <h2 className="text-lg font-semibold text-text mb-4">Con @{s.contraparteNombre}</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-primary mb-3">Te puede dar</p>
                  <div className="flex flex-col gap-2">
                    {s.figuritasARecibir.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => proponer(s, f)}
                        className="text-left p-3 bg-surface2 rounded-lg border border-border hover:border-primary transition-colors"
                      >
                        <p className="text-sm font-bold text-text">{f.jugadorNombre} <span className="text-muted font-normal">#{f.numero}</span></p>
                        <p className="text-xs text-muted">{f.seleccionNombre} · {f.equipoNombre}</p>
                        <p className="text-xs text-primary mt-1">Proponer intercambio →</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text mb-3">Vos le podés dar</p>
                  <div className="flex flex-col gap-2">
                    {s.figuritasAOfrecer.map((f) => (
                      <div key={f.id} className="p-3 bg-surface2 rounded-lg border border-border">
                        <p className="text-sm font-bold text-text">{f.jugadorNombre} <span className="text-muted font-normal">#{f.numero}</span></p>
                        <p className="text-xs text-muted">{f.seleccionNombre} · {f.equipoNombre}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Ruta en `router.tsx`** — import lazy + ruta dentro de `PrivateRoute`/`MainLayout` children:
```tsx
const SugerenciasPage = lazy(() => import('../pages/sugerencias/SugerenciasPage'));
```
```tsx
          { path: 'sugerencias', element: <SugerenciasPage /> },
```
(agregar junto a `buscar`/`intercambios`).

- [ ] **Step 3: Sidebar en `MainLayout.tsx`** — agregar icono `sugerencias` al objeto `icons` y la entrada al array `navLinks` (entre Propuestas y Subastas).

Icono (dentro de `icons`):
```tsx
  sugerencias: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9.663 17h4.673M12 3v1M5.6 6.6l.7.7M18.4 6.6l-.7.7M4 12H3m18 0h-1M7 12a5 5 0 1 1 10 0c0 2-1.5 3-2 4H9c-.5-1-2-2-2-4z" />
    </svg>
  ),
```
navLink:
```tsx
  { to: '/sugerencias', label: 'Sugerencias', icon: 'sugerencias' },
```

- [ ] **Step 4: Verificar** — `cd frontend && npm run build`. Esperado: compila.

---

### Task 5: Frontend — prefill de propuesta en `NuevaPage`

**Files:**
- Modify: `frontend/src/pages/propuestas/NuevaPage.tsx`

- [ ] **Step 1: Leer `figuritasOfrecidasBaseIds` del state y pre-tildar**

Tras `const figuritaDelLink = ...`:
```tsx
  const offeredBaseIds = location.state?.figuritasOfrecidasBaseIds as string[] | undefined;
```
Agregar un efecto que, cuando carguen `misFiguritas` y haya `offeredBaseIds`, pre-seleccione las ofrecidas y expanda la sección:
```tsx
  useEffect(() => {
    if (offeredBaseIds && offeredBaseIds.length > 0 && misFiguritas.length > 0) {
      const ids = misFiguritas
        .filter((f) => offeredBaseIds.includes(f.figuritaBaseId))
        .map((f) => f.id);
      if (ids.length > 0) {
        setFiguritasOfrecidas(ids);
        setExpandedMias(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misFiguritas]);
```

- [ ] **Step 2: Verificar** — `cd frontend && npm run build`. Esperado: compila; sin `state` el comportamiento es idéntico.

---

### Task 6: Frontend — wiring real del Dashboard

**Files:**
- Modify: `frontend/src/pages/home/DashboardPage.tsx`

- [ ] **Step 1: Reemplazar la sección mock "Disponibles para intercambio"** por sugerencias reales.

Agregar imports e hidratación de datos:
```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';
```
Tipos (al lado de los demás):
```tsx
interface FiguritaResponseDTO {
  id: string; figuritaBaseId: string; numero: number; jugadorNombre: string;
  seleccionNombre: string; equipoNombre: string; categoriaNombre: string;
  count: number; ownerId: string; ownerName: string;
}
interface SugerenciaResponseDTO {
  contraparteId: string; contraparteNombre: string;
  figuritasARecibir: FiguritaResponseDTO[]; figuritasAOfrecer: FiguritaResponseDTO[];
}
```
Dentro de `DashboardPage`, cargar y aplanar (cap 8):
```tsx
  const { user } = useAuth();
  const [sugeridas, setSugeridas] = useState<{ s: SugerenciaResponseDTO; f: FiguritaResponseDTO }[]>([]);

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/sugerencias`)
      .then((res) => {
        const flat = (res.data as SugerenciaResponseDTO[])
          .flatMap((s) => s.figuritasARecibir.map((f) => ({ s, f })))
          .slice(0, 8);
        setSugeridas(flat);
      })
      .catch((err) => console.error('Error fetching sugerencias:', err));
  }, [user?.username]);
```
Reemplazar la `<Section title="Disponibles para intercambio" ...>` y su `.map` mock por:
```tsx
      <Section title="Sugerencias para vos" color={BLUE} to="/sugerencias" toLabel="Ver todas">
        {sugeridas.length === 0 ? (
          <p className="text-sm text-gray-400">Sin sugerencias por ahora.</p>
        ) : (
          sugeridas.map(({ s, f }) => (
            <button
              key={`${s.contraparteId}-${f.id}`}
              onClick={() => navigate('/propuestas/nueva', { state: { figuritaSeleccionada: f, figuritasOfrecidasBaseIds: s.figuritasAOfrecer.map((x) => x.figuritaBaseId) } })}
              className="text-left min-w-[180px] p-4 rounded-2xl bg-white border hover:-translate-y-0.5 transition-transform"
              style={{ border: `1.5px solid ${BLUE}30` }}
            >
              <p className="text-sm font-bold text-gray-900">{f.jugadorNombre} <span className="text-gray-400 font-normal">#{f.numero}</span></p>
              <p className="text-xs text-gray-500">{f.seleccionNombre} · {f.equipoNombre}</p>
              <p className="text-xs text-gray-400 mt-2">De @{s.contraparteNombre}</p>
              <p className="text-xs mt-2 font-semibold" style={{ color: BLUE }}>Proponer →</p>
            </button>
          ))
        )}
      </Section>
```
Eliminar el array mock `FIGURITAS` y el import de `Figurita` si quedan sin uso. **Dejar** intactas las secciones Propuestas/Subastas/Alertas (siguen mock, fuera de alcance).
> Nota: `Section`/`Carousel` usan `useNavigate`; `navigate` ya está disponible en `DashboardPage`. Mantener el `navigate` existente.

- [ ] **Step 2: Verificar** — `cd frontend && npm run build`. Esperado: compila; no quedan imports sin usar (revisar `Figurita`).

---

## Verificación final (al cierre, antes de Puppeteer)

- [ ] `cd backend && ./mvnw -q -Dtest=SugerenciaServiceTest test` → PASS.
- [ ] `cd backend && ./mvnw -q -DskipTests package` → BUILD SUCCESS.
- [ ] `cd frontend && npm run build` → OK.
- [ ] Lint frontend sin errores nuevos en archivos de sugerencias.

## Self-Review (cobertura del spec)

- Modelo `Sugerencia` real persistido → Task 1 (con desvío documentado a snapshots embebidos). ✓
- Matching bidireccional + reemplazo por usuario → Task 2. ✓
- Job @Scheduled 3 AM + endpoint manual ADMIN → Task 3. ✓
- `GET /api/usuarios/{userName}/sugerencias` + DTO agrupado por contraparte → Tasks 1/3. ✓
- Página `/sugerencias` + sidebar → Task 4. ✓
- Click → prearmar propuesta (prefill por base id) → Tasks 4/5. ✓
- Dashboard real → Task 6. ✓
- Tests backend del matching → Task 2. ✓
- Simplificación "toda repetida es intercambiable" (sin modalidad/cantidad) → inherente al algoritmo. ✓
