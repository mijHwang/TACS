# Catálogo real de figuritas (Mundial 2026) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-poblar la base con un catálogo realista del Mundial FIFA 2026 (~850 `FiguritaBase`, 48 selecciones, fotos reales de jugadores), cargado automáticamente al arrancar desde un JSON commiteado, y adaptar el seeder de demo para usar ese catálogo.

**Architecture:** Un JSON estático en `resources/data/` es la fuente de verdad. Un `CatalogoService` lo parsea y persiste (selecciones, categorías, clubes, jugadores, figuritas_base con `numero` secuencial e `imagenUrl`). Un `CatalogoSeeder` (CommandLineRunner) lo carga al arrancar solo si la base está vacía (idempotente). El `DemoSeedService` deja de hardcodear 48 bases falsas y arma su escenario de trading sobre las primeras 48 bases del catálogo real. Las fotos las resuelve **offline una vez** un script dev (gitignored) que enriquece el JSON; el backend nunca llama a la API.

**Tech Stack:** Java 21, Spring Boot 4.0.5, Spring Data MongoDB, Jackson (`ObjectMapper`), Lombok, JUnit 5 + Mockito. Frontend: React 19 + TypeScript, Vitest + Testing Library. Resolver: Node 18+ (`fetch` global).

## Global Constraints

- **Java 21 / Spring Boot 4.0.5**; modelos con Lombok `@Data @NoArgsConstructor @AllArgsConstructor @Builder`, `@Document`, `@Id String id`. Referencias cross-entity con `@DocumentReference(lazy = true)`.
- **Métodos de service en español** (convención del repo): `crear`, `obtenerTodas`, `cargarDesdeJson`, etc.
- **Argentina debe ser la PRIMERA selección del JSON**, con ≥18 jugadores. De esto depende que las bases 1..18 sean de Argentina y que la subasta de demo "Solo Argentina" (ofrece la base 7, condición selección=Argentina) siga siendo coherente.
- **`imagenUrl` es nullable** en todo el stack (modelo, DTOs, tipos TS). El front siempre tiene fallback.
- **El backend NO llama a ninguna API en runtime.** Las fotos se resuelven offline y quedan embebidas en el JSON commiteado.
- **`/scripts/` está gitignored**: el resolver de imágenes vive ahí; lo que se commitea es el JSON enriquecido bajo `backend/src/main/resources/data/`.
- **Categorías válidas:** exactamente `{"Oro", "Plata", "Bronce"}`.
- **Commits frecuentes**, en español, estilo conventional commits (`feat:`, `refactor:`, `test:`, `chore:`). No commitear sin que el plan lo indique como paso.

---

## File Structure

**Backend — nuevos**
- `backend/src/main/java/com/grupo3/tp/dtos/catalogo/CatalogoJson.java` — record raíz del JSON.
- `backend/src/main/java/com/grupo3/tp/dtos/catalogo/SeleccionJson.java` — record selección.
- `backend/src/main/java/com/grupo3/tp/dtos/catalogo/JugadorJson.java` — record jugador.
- `backend/src/main/java/com/grupo3/tp/service/CatalogoService.java` — parseo + persistencia del catálogo.
- `backend/src/main/java/com/grupo3/tp/configs/CatalogoSeeder.java` — carga idempotente al arrancar.
- `backend/src/main/resources/data/figuritas-mundial-2026.json` — el dataset real (commiteado).
- `backend/src/test/java/com/grupo3/tp/service/CatalogoServicePersistTest.java`
- `backend/src/test/java/com/grupo3/tp/configs/CatalogoSeederTest.java`
- `backend/src/test/java/com/grupo3/tp/service/CatalogoDatasetTest.java`

**Backend — modificados**
- `models/FiguritaBase.java` (+ `imagenUrl`)
- `dtos/FiguritaResponseDTO.java`, `dtos/FiguritaBaseDTO.java` (+ `imagenUrl`)
- `service/FiguritaService.java` (mapear `imagenUrl`)
- `service/DemoSeedService.java` (usar `CatalogoService`; subset real)
- `test/.../FiguritaServiceTest.java`, `test/.../DemoSeedServiceTest.java` (+ tests)

**Backend — eliminado**
- `configs/FiguritaBaseSeeder.java` (CommandLineRunner comentado, muerto)

**Frontend — modificados**
- `src/hooks/useFiguritas.ts`, `src/types/dashboard.ts` (+ `imagenUrl`)
- `src/pages/coleccion/components/TarjetaColeccion.tsx` (render foto + fallback)
- `src/pages/coleccion/TodasPage.tsx`, `FaltantesPage.tsx`, `RepetidasPage.tsx` (pasar `imagenUrl`)
- `src/pages/coleccion/components/TarjetaColeccion.test.tsx` (nuevo)

**Frontend — e2e (Task 9)**
- `frontend/package.json` (devDependency `puppeteer` + script `e2e`)
- `frontend/e2e/figuritas.e2e.mjs` (nuevo, commiteado)

**Scripts — nuevos (gitignored)**
- `scripts/figuritas/resolve-images.mjs`, `scripts/figuritas/README.md`, `scripts/figuritas/overrides.json`

---

## Task 1: Campo `imagenUrl` en modelo, DTOs y `FiguritaService`

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/models/FiguritaBase.java`
- Modify: `backend/src/main/java/com/grupo3/tp/dtos/FiguritaResponseDTO.java`
- Modify: `backend/src/main/java/com/grupo3/tp/dtos/FiguritaBaseDTO.java`
- Modify: `backend/src/main/java/com/grupo3/tp/service/FiguritaService.java`
- Modify: `backend/src/main/java/com/grupo3/tp/service/SugerenciaService.java`
- Modify: `backend/src/main/java/com/grupo3/tp/repository/FiguritaRepositoryCustomImpl.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/FiguritaServiceTest.java`

**Interfaces:**
- Produces: `FiguritaBase.getImagenUrl()/setImagenUrl(String)`; `FiguritaResponseDTO` con `imagenUrl` como **último** campo del `@AllArgsConstructor`; `FiguritaBaseDTO` con `imagenUrl` como **último** campo.

> ⚠️ `FiguritaResponseDTO` se construye posicionalmente en **6 sitios** del backend (4 en `FiguritaService`, 1 en `SugerenciaService.toDTO`, 1 en `FiguritaRepositoryCustomImpl.findRepetidas`) y `FiguritaBaseDTO` en 1 (`FiguritaService.obtenerFaltantes`). Al ser `@AllArgsConstructor`, **todos** deben recibir el nuevo arg final o el backend no compila.

- [ ] **Step 1: Escribir el test que falla** — agregar este método a `FiguritaServiceTest.java` (antes del cierre `}` de la clase):

```java
    @Test
    public void testObtenerPorUserIdIncluyeImagenUrl() {
        FiguritaBase baseConFoto = FiguritaBase.builder()
                .id("fig-base-9").numero(9)
                .seleccion(new Seleccion("sel-1", "Argentina", "CONMEBOL"))
                .equipo(new Equipo("eq-9", "Inter Miami"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-9", "Lionel Messi"))
                .imagenUrl("https://img.test/messi.png")
                .build();
        Figurita fig = Figurita.builder().id("fig-9").figuritaBase(baseConFoto).owner(usuario1).build();
        when(repo.findByFiguritaOwnerId("user-1")).thenReturn(List.of(fig));

        List<FiguritaResponseDTO> result = service.obtenerPorUserId("user-1");

        assertEquals(1, result.size());
        assertEquals("https://img.test/messi.png", result.get(0).getImagenUrl());
    }
```

- [ ] **Step 2: Correr el test y verificar que falla a compilar**

Run: `cd backend && ./mvnw test -Dtest=FiguritaServiceTest#testObtenerPorUserIdIncluyeImagenUrl`
Expected: FAIL de compilación — `imagenUrl(...)` y `getImagenUrl()` no existen aún.

- [ ] **Step 3: Agregar el campo al modelo** — en `FiguritaBase.java`, agregar tras la línea `private Jugador jugador;` (antes del `}`):

```java
    private String imagenUrl;
```

- [ ] **Step 4: Agregar el campo a los DTOs** — en `FiguritaResponseDTO.java`, agregar como **último** campo (tras `private String ownerName;`):

```java
    private String imagenUrl;
```

En `FiguritaBaseDTO.java`, agregar como **último** campo (tras `private String categoriaNombre;`):

```java
    private String imagenUrl;
```

- [ ] **Step 5: Propagar en `FiguritaService.java`** — agregar el argumento `imagenUrl` (último) en los 4 sitios que construyen DTOs.

En `obtenerPorUserId` (constructor `new FiguritaResponseDTO(...)`), cambiar la última línea de args de:
```java
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername()
                ))
```
a:
```java
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername(),
                        group.get(0).getFiguritaBase().getImagenUrl()
                ))
```

En `obtenerTodas`, idéntico cambio (mismo bloque, agregar `group.get(0).getFiguritaBase().getImagenUrl()` como último arg).

En `obtenerTodasSinAgrupar`, cambiar:
```java
                        figurita.getOwner().getId(),
                        figurita.getOwner().getUsername()
                ))
```
a:
```java
                        figurita.getOwner().getId(),
                        figurita.getOwner().getUsername(),
                        figurita.getFiguritaBase().getImagenUrl()
                ))
```

En `obtenerFaltantes`, cambiar el `new FiguritaBaseDTO(...)`:
```java
                        base.getEquipo().getNombre(),
                        base.getCategoria().getNombre()
                ))
```
a:
```java
                        base.getEquipo().getNombre(),
                        base.getCategoria().getNombre(),
                        base.getImagenUrl()
                ))
```

- [ ] **Step 5b: Propagar en `SugerenciaService.java`** — en el método `toDTO` (~línea 120), cambiar el final del `new FiguritaResponseDTO(...)`:
```java
                f.getOwner().getId(),
                f.getOwner().getUsername()
        );
```
a:
```java
                f.getOwner().getId(),
                f.getOwner().getUsername(),
                f.getFiguritaBase().getImagenUrl()
        );
```

- [ ] **Step 5c: Propagar en `FiguritaRepositoryCustomImpl.java`** — en `findRepetidas` (~línea 44), cambiar el final del `new FiguritaResponseDTO(...)`:
```java
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername()
                ))
```
a:
```java
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername(),
                        group.get(0).getFiguritaBase().getImagenUrl()
                ))
```

- [ ] **Step 6: Correr el test y compilar el backend completo**

Run: `cd backend && ./mvnw test -Dtest=FiguritaServiceTest && ./mvnw clean package -DskipTests`
Expected: el test pasa (incluido el nuevo) y `BUILD SUCCESS` (confirma que los 6 sitios del constructor compilan).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/models/FiguritaBase.java \
        backend/src/main/java/com/grupo3/tp/dtos/FiguritaResponseDTO.java \
        backend/src/main/java/com/grupo3/tp/dtos/FiguritaBaseDTO.java \
        backend/src/main/java/com/grupo3/tp/service/FiguritaService.java \
        backend/src/main/java/com/grupo3/tp/service/SugerenciaService.java \
        backend/src/main/java/com/grupo3/tp/repository/FiguritaRepositoryCustomImpl.java \
        backend/src/test/java/com/grupo3/tp/service/FiguritaServiceTest.java
git commit -m "feat(figuritas): agregar imagenUrl a FiguritaBase y DTOs"
```

---

## Task 2: Records de parseo del JSON + lectura del recurso

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/dtos/catalogo/CatalogoJson.java`
- Create: `backend/src/main/java/com/grupo3/tp/dtos/catalogo/SeleccionJson.java`
- Create: `backend/src/main/java/com/grupo3/tp/dtos/catalogo/JugadorJson.java`
- Create: `backend/src/test/resources/data/figuritas-test.json` (fixture)
- Create: `backend/src/test/java/com/grupo3/tp/dtos/catalogo/CatalogoJsonParseTest.java`

**Interfaces:**
- Produces: `CatalogoJson(String torneo, List<String> categorias, List<SeleccionJson> selecciones)`;
  `SeleccionJson(String nombre, String confederacion, List<JugadorJson> jugadores)`;
  `JugadorJson(String nombre, String club, String categoria, String imagenUrl)`.

- [ ] **Step 1: Crear el fixture de test** — `backend/src/test/resources/data/figuritas-test.json`:

```json
{
  "torneo": "Test Cup",
  "categorias": ["Oro", "Plata"],
  "selecciones": [
    {
      "nombre": "Argentina",
      "confederacion": "CONMEBOL",
      "jugadores": [
        { "nombre": "Lionel Messi", "club": "Inter Miami", "categoria": "Oro", "imagenUrl": "https://img/messi.png" },
        { "nombre": "Paulo Dybala", "club": "Roma", "categoria": "Plata", "imagenUrl": null }
      ]
    }
  ]
}
```

- [ ] **Step 2: Escribir el test que falla** — `CatalogoJsonParseTest.java`:

```java
package com.grupo3.tp.dtos.catalogo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;

class CatalogoJsonParseTest {

    @Test
    void parseaElFixture() throws Exception {
        ObjectMapper om = new ObjectMapper();
        CatalogoJson cat;
        try (InputStream is = new ClassPathResource("data/figuritas-test.json").getInputStream()) {
            cat = om.readValue(is, CatalogoJson.class);
        }
        assertEquals(1, cat.selecciones().size());
        SeleccionJson arg = cat.selecciones().get(0);
        assertEquals("Argentina", arg.nombre());
        assertEquals("CONMEBOL", arg.confederacion());
        assertEquals(2, arg.jugadores().size());
        assertEquals("Lionel Messi", arg.jugadores().get(0).nombre());
        assertEquals("https://img/messi.png", arg.jugadores().get(0).imagenUrl());
        assertNull(arg.jugadores().get(1).imagenUrl());
    }
}
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw test -Dtest=CatalogoJsonParseTest`
Expected: FAIL de compilación — los records no existen.

- [ ] **Step 4: Crear los records** — `CatalogoJson.java`:

```java
package com.grupo3.tp.dtos.catalogo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogoJson(String torneo, List<String> categorias, List<SeleccionJson> selecciones) {}
```

`SeleccionJson.java`:

```java
package com.grupo3.tp.dtos.catalogo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SeleccionJson(String nombre, String confederacion, List<JugadorJson> jugadores) {}
```

`JugadorJson.java`:

```java
package com.grupo3.tp.dtos.catalogo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JugadorJson(String nombre, String club, String categoria, String imagenUrl) {}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw test -Dtest=CatalogoJsonParseTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/dtos/catalogo/ \
        backend/src/test/resources/data/figuritas-test.json \
        backend/src/test/java/com/grupo3/tp/dtos/catalogo/CatalogoJsonParseTest.java
git commit -m "feat(catalogo): records de parseo del JSON de figuritas"
```

---

## Task 3: `CatalogoService` — construir y persistir el catálogo

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/service/CatalogoService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/CatalogoServicePersistTest.java`

**Interfaces:**
- Consumes: records de Task 2; `FiguritaBase.imagenUrl` de Task 1; repos `SeleccionRepository`, `EquipoRepository`, `JugadorRepository`, `CategoriaFiguritaRepository`, `FiguritaBaseRepository`.
- Produces: `CatalogoService.cargarDesdeJson() -> ResultadoCarga`; `catalogoVacio() -> boolean`; `persistirCatalogo(CatalogoJson) -> ResultadoCarga`; `record ResultadoCarga(int selecciones, int categorias, int equipos, int jugadores, int figuritasBase)`.

- [ ] **Step 1: Escribir el test que falla** — `CatalogoServicePersistTest.java`:

```java
package com.grupo3.tp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grupo3.tp.dtos.catalogo.CatalogoJson;
import com.grupo3.tp.dtos.catalogo.JugadorJson;
import com.grupo3.tp.dtos.catalogo.SeleccionJson;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogoServicePersistTest {

    @Mock SeleccionRepository seleccionRepo;
    @Mock EquipoRepository equipoRepo;
    @Mock JugadorRepository jugadorRepo;
    @Mock CategoriaFiguritaRepository categoriaRepo;
    @Mock FiguritaBaseRepository figuritaBaseRepo;

    CatalogoService service;

    @BeforeEach
    void setUp() {
        service = new CatalogoService(new ObjectMapper(), seleccionRepo, equipoRepo,
                jugadorRepo, categoriaRepo, figuritaBaseRepo);
        when(seleccionRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(equipoRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(jugadorRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(categoriaRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(figuritaBaseRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void persistirAsignaNumeroSecuencialPropagaImagenUrlYDedupClubes() {
        CatalogoJson catalogo = new CatalogoJson("WC", List.of("Oro", "Plata"), List.of(
                new SeleccionJson("Argentina", "CONMEBOL", List.of(
                        new JugadorJson("Messi", "Inter Miami", "Oro", "https://img/messi.png"),
                        new JugadorJson("Dybala", "Roma", "Plata", null))),
                new SeleccionJson("Brazil", "CONMEBOL", List.of(
                        new JugadorJson("Neymar", "Al Hilal", "Oro", "https://img/neymar.png")))));

        CatalogoService.ResultadoCarga r = service.persistirCatalogo(catalogo);

        assertEquals(2, r.selecciones());
        assertEquals(2, r.categorias());
        assertEquals(3, r.equipos());
        assertEquals(3, r.jugadores());
        assertEquals(3, r.figuritasBase());

        ArgumentCaptor<FiguritaBase> cap = ArgumentCaptor.forClass(FiguritaBase.class);
        verify(figuritaBaseRepo, times(3)).save(cap.capture());
        List<FiguritaBase> bases = cap.getAllValues();
        assertEquals(1, bases.get(0).getNumero());
        assertEquals(2, bases.get(1).getNumero());
        assertEquals(3, bases.get(2).getNumero());
        assertEquals("https://img/messi.png", bases.get(0).getImagenUrl());
        assertNull(bases.get(1).getImagenUrl());
        assertEquals("Argentina", bases.get(0).getSeleccion().getNombre());
        assertEquals("CONMEBOL", bases.get(0).getSeleccion().getGrupo());
        verify(equipoRepo, times(3)).save(any());
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw test -Dtest=CatalogoServicePersistTest`
Expected: FAIL de compilación — `CatalogoService` no existe.

- [ ] **Step 3: Crear `CatalogoService.java`**:

```java
package com.grupo3.tp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grupo3.tp.dtos.catalogo.CatalogoJson;
import com.grupo3.tp.dtos.catalogo.JugadorJson;
import com.grupo3.tp.dtos.catalogo.SeleccionJson;
import com.grupo3.tp.models.CategoriaFigurita;
import com.grupo3.tp.models.Equipo;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Jugador;
import com.grupo3.tp.models.Seleccion;
import com.grupo3.tp.repository.CategoriaFiguritaRepository;
import com.grupo3.tp.repository.EquipoRepository;
import com.grupo3.tp.repository.FiguritaBaseRepository;
import com.grupo3.tp.repository.JugadorRepository;
import com.grupo3.tp.repository.SeleccionRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Carga el catálogo real de figuritas del Mundial 2026 desde un JSON commiteado.
 * Fuente única de verdad usada por el loader de arranque y por el seeder de demo.
 */
@Service
public class CatalogoService {

    static final String RESOURCE_PATH = "data/figuritas-mundial-2026.json";

    private final ObjectMapper objectMapper;
    private final SeleccionRepository seleccionRepo;
    private final EquipoRepository equipoRepo;
    private final JugadorRepository jugadorRepo;
    private final CategoriaFiguritaRepository categoriaRepo;
    private final FiguritaBaseRepository figuritaBaseRepo;

    public CatalogoService(ObjectMapper objectMapper,
                           SeleccionRepository seleccionRepo,
                           EquipoRepository equipoRepo,
                           JugadorRepository jugadorRepo,
                           CategoriaFiguritaRepository categoriaRepo,
                           FiguritaBaseRepository figuritaBaseRepo) {
        this.objectMapper = objectMapper;
        this.seleccionRepo = seleccionRepo;
        this.equipoRepo = equipoRepo;
        this.jugadorRepo = jugadorRepo;
        this.categoriaRepo = categoriaRepo;
        this.figuritaBaseRepo = figuritaBaseRepo;
    }

    /** True si todavía no se cargó el catálogo (no hay ninguna figurita base). */
    public boolean catalogoVacio() {
        return figuritaBaseRepo.count() == 0;
    }

    /** Lee el JSON real del classpath. */
    CatalogoJson leerCatalogo() {
        try (InputStream is = new ClassPathResource(RESOURCE_PATH).getInputStream()) {
            return objectMapper.readValue(is, CatalogoJson.class);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo leer " + RESOURCE_PATH, e);
        }
    }

    /** Lee el JSON real y persiste todo el catálogo. */
    public ResultadoCarga cargarDesdeJson() {
        return persistirCatalogo(leerCatalogo());
    }

    /**
     * Persiste el catálogo parseado: categorías, selecciones, clubes (dedup), jugadores y
     * figuritas_base con numero secuencial (1..N) e imagenUrl. La confederación va a Seleccion.grupo.
     */
    ResultadoCarga persistirCatalogo(CatalogoJson catalogo) {
        Map<String, CategoriaFigurita> categorias = new HashMap<>();
        for (String nombre : catalogo.categorias()) {
            categorias.put(nombre, categoriaRepo.save(new CategoriaFigurita(null, nombre)));
        }

        Map<String, Equipo> clubes = new HashMap<>();
        int numero = 1;
        int nSel = 0, nJug = 0, nBase = 0;

        for (SeleccionJson sj : catalogo.selecciones()) {
            Seleccion sel = seleccionRepo.save(new Seleccion(null, sj.nombre(), sj.confederacion()));
            nSel++;
            for (JugadorJson jj : sj.jugadores()) {
                Equipo club = clubes.computeIfAbsent(jj.club(),
                        nombre -> equipoRepo.save(new Equipo(null, nombre)));
                CategoriaFigurita cat = categorias.computeIfAbsent(jj.categoria(),
                        nombre -> categoriaRepo.save(new CategoriaFigurita(null, nombre)));
                Jugador jugador = jugadorRepo.save(new Jugador(null, jj.nombre()));
                nJug++;
                figuritaBaseRepo.save(FiguritaBase.builder()
                        .numero(numero++)
                        .seleccion(sel)
                        .equipo(club)
                        .categoria(cat)
                        .jugador(jugador)
                        .imagenUrl(jj.imagenUrl())
                        .build());
                nBase++;
            }
        }
        return new ResultadoCarga(nSel, categorias.size(), clubes.size(), nJug, nBase);
    }

    public record ResultadoCarga(int selecciones, int categorias, int equipos,
                                 int jugadores, int figuritasBase) {}
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw test -Dtest=CatalogoServicePersistTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/service/CatalogoService.java \
        backend/src/test/java/com/grupo3/tp/service/CatalogoServicePersistTest.java
git commit -m "feat(catalogo): CatalogoService para persistir el catálogo desde JSON"
```

---

## Task 4: `CatalogoSeeder` (carga idempotente al arrancar) + borrar seeder muerto

**Files:**
- Create: `backend/src/main/java/com/grupo3/tp/configs/CatalogoSeeder.java`
- Delete: `backend/src/main/java/com/grupo3/tp/configs/FiguritaBaseSeeder.java`
- Test: `backend/src/test/java/com/grupo3/tp/configs/CatalogoSeederTest.java`

**Interfaces:**
- Consumes: `CatalogoService.catalogoVacio()`, `CatalogoService.cargarDesdeJson()`.
- Produces: bean `CatalogoSeeder` (`CommandLineRunner`).

- [ ] **Step 1: Escribir el test que falla** — `CatalogoSeederTest.java`:

```java
package com.grupo3.tp.configs;

import com.grupo3.tp.service.CatalogoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogoSeederTest {

    @Mock CatalogoService catalogoService;
    @InjectMocks CatalogoSeeder seeder;

    @Test
    void cargaCuandoElCatalogoEstaVacio() throws Exception {
        when(catalogoService.catalogoVacio()).thenReturn(true);
        when(catalogoService.cargarDesdeJson())
                .thenReturn(new CatalogoService.ResultadoCarga(48, 3, 200, 850, 850));

        seeder.run();

        verify(catalogoService).cargarDesdeJson();
    }

    @Test
    void noCargaCuandoYaHayCatalogo() throws Exception {
        when(catalogoService.catalogoVacio()).thenReturn(false);

        seeder.run();

        verify(catalogoService, never()).cargarDesdeJson();
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw test -Dtest=CatalogoSeederTest`
Expected: FAIL de compilación — `CatalogoSeeder` no existe.

- [ ] **Step 3: Crear `CatalogoSeeder.java`**:

```java
package com.grupo3.tp.configs;

import com.grupo3.tp.service.CatalogoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Carga el catálogo real al arrancar, solo si la base está vacía (idempotente, no destructivo). */
@Component
public class CatalogoSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogoSeeder.class);

    private final CatalogoService catalogoService;

    public CatalogoSeeder(CatalogoService catalogoService) {
        this.catalogoService = catalogoService;
    }

    @Override
    public void run(String... args) {
        if (!catalogoService.catalogoVacio()) {
            log.info("Catálogo ya presente; se omite la carga inicial.");
            return;
        }
        CatalogoService.ResultadoCarga r = catalogoService.cargarDesdeJson();
        log.info("Catálogo cargado: {} selecciones, {} figuritas base.",
                r.selecciones(), r.figuritasBase());
    }
}
```

- [ ] **Step 4: Borrar el seeder muerto**

```bash
git rm backend/src/main/java/com/grupo3/tp/configs/FiguritaBaseSeeder.java
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw test -Dtest=CatalogoSeederTest`
Expected: PASS (2 tests verdes).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/configs/CatalogoSeeder.java \
        backend/src/test/java/com/grupo3/tp/configs/CatalogoSeederTest.java
git commit -m "feat(catalogo): carga idempotente al arrancar; eliminar FiguritaBaseSeeder muerto"
```

---

## Task 5: Dataset real `figuritas-mundial-2026.json` + test de validación

**Files:**
- Create: `backend/src/main/resources/data/figuritas-mundial-2026.json`
- Test: `backend/src/test/java/com/grupo3/tp/service/CatalogoDatasetTest.java`

**Interfaces:**
- Consumes: records de Task 2.
- Produces: el recurso commiteado que leen Task 3/4 en runtime.

**Cómo generar el JSON (contenido, no código):** producir las **48 selecciones** clasificadas al Mundial 2026, **Argentina primera**, cada una con **~18 jugadores reales** (`nombre`, `club` real actual, `categoria` ∈ Oro/Plata/Bronce). Repartir categorías: ~3-4 Oro (figuras), ~7-8 Plata (titulares), resto Bronce. `imagenUrl` inicia en `null` (lo completa Task 6). Para selecciones de repechaje aún no confirmadas a ene-2026, usar la mejor estimación y marcarlas para revisión. El número de figurita NO va en el JSON (se asigna al cargar). Estructura por entrada exactamente como el fixture de Task 2.

- [ ] **Step 1: Escribir el test de validación que falla** — `CatalogoDatasetTest.java`:

```java
package com.grupo3.tp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grupo3.tp.dtos.catalogo.CatalogoJson;
import com.grupo3.tp.dtos.catalogo.JugadorJson;
import com.grupo3.tp.dtos.catalogo.SeleccionJson;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class CatalogoDatasetTest {

    @Test
    void datasetRealEsValido() throws Exception {
        ObjectMapper om = new ObjectMapper();
        CatalogoJson cat;
        try (InputStream is = new ClassPathResource("data/figuritas-mundial-2026.json").getInputStream()) {
            cat = om.readValue(is, CatalogoJson.class);
        }

        assertEquals(48, cat.selecciones().size(), "deben ser 48 selecciones");
        assertEquals("Argentina", cat.selecciones().get(0).nombre(), "Argentina debe ir primera");

        Set<String> categoriasValidas = Set.of("Oro", "Plata", "Bronce");
        int totalJugadores = 0;
        for (SeleccionJson s : cat.selecciones()) {
            assertNotNull(s.confederacion());
            assertFalse(s.confederacion().isBlank(), "confederación vacía en " + s.nombre());
            assertFalse(s.jugadores().isEmpty(), "selección sin jugadores: " + s.nombre());
            for (JugadorJson j : s.jugadores()) {
                assertFalse(j.nombre().isBlank(), "jugador sin nombre en " + s.nombre());
                assertFalse(j.club().isBlank(), "jugador sin club: " + j.nombre());
                assertTrue(categoriasValidas.contains(j.categoria()),
                        "categoria inválida (" + j.categoria() + ") en " + j.nombre());
                totalJugadores++;
            }
        }
        assertTrue(totalJugadores >= 700,
                "se esperaban ~850 jugadores; hubo " + totalJugadores);
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw test -Dtest=CatalogoDatasetTest`
Expected: FAIL — el recurso `data/figuritas-mundial-2026.json` no existe todavía.

- [ ] **Step 3: Generar el dataset** — crear `backend/src/main/resources/data/figuritas-mundial-2026.json` con las 48 selecciones (Argentina primera, ~18 jugadores c/u, `imagenUrl: null`). Inicio del archivo, a modo de forma exacta:

```json
{
  "torneo": "FIFA World Cup 2026",
  "categorias": ["Oro", "Plata", "Bronce"],
  "selecciones": [
    {
      "nombre": "Argentina",
      "confederacion": "CONMEBOL",
      "jugadores": [
        { "nombre": "Lionel Messi", "club": "Inter Miami", "categoria": "Oro", "imagenUrl": null },
        { "nombre": "Emiliano Martínez", "club": "Aston Villa", "categoria": "Plata", "imagenUrl": null }
      ]
    }
  ]
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd backend && ./mvnw test -Dtest=CatalogoDatasetTest`
Expected: PASS. Si falla por conteos, ajustar el JSON (48 selecciones, Argentina primera, ≥700 jugadores, categorías válidas).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/data/figuritas-mundial-2026.json \
        backend/src/test/java/com/grupo3/tp/service/CatalogoDatasetTest.java
git commit -m "feat(catalogo): dataset real del Mundial 2026 (48 selecciones, ~850 figuritas)"
```

---

## Task 6: Resolver de imágenes (script dev, offline) + enriquecer el JSON

**Files:**
- Create: `scripts/figuritas/resolve-images.mjs` (gitignored)
- Create: `scripts/figuritas/overrides.json` (gitignored)
- Create: `scripts/figuritas/README.md` (gitignored)
- Modify (en disco, vía el script): `backend/src/main/resources/data/figuritas-mundial-2026.json` (se rellena `imagenUrl`)

**Interfaces:**
- Consumes: el JSON de Task 5. Produces: el mismo JSON con `imagenUrl` resuelta donde haya foto.

- [ ] **Step 1: Crear `scripts/figuritas/overrides.json`** (correcciones manuales; arranca vacío):

```json
{}
```

- [ ] **Step 2: Crear `scripts/figuritas/resolve-images.mjs`**:

```js
// Resuelve imagenUrl de cada jugador contra TheSportsDB y reescribe el JSON commiteado.
// Uso: SPORTSDB_KEY=<key> node scripts/figuritas/resolve-images.mjs   (key por defecto: "3")
import { readFile, writeFile } from 'node:fs/promises';

const JSON_PATH = new URL(
  '../../backend/src/main/resources/data/figuritas-mundial-2026.json', import.meta.url);
const OVERRIDES_PATH = new URL('./overrides.json', import.meta.url);
const API_KEY = process.env.SPORTSDB_KEY ?? '3';
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadOverrides() {
  try { return JSON.parse(await readFile(OVERRIDES_PATH, 'utf8')); }
  catch { return {}; }
}

async function resolvePlayer(nombre, seleccionNombre) {
  const url = `${BASE}/searchplayers.php?p=${encodeURIComponent(nombre)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const players = data.player ?? [];
  if (players.length === 0) return null;
  // Desambiguar por nacionalidad cuando se pueda, para no traer un homónimo.
  const match = players.find(
    (p) => (p.strNationality ?? '').toLowerCase() === seleccionNombre.toLowerCase()
  ) ?? players[0];
  return match.strCutout || match.strThumb || null;
}

async function main() {
  const catalogo = JSON.parse(await readFile(JSON_PATH, 'utf8'));
  const overrides = await loadOverrides();
  let resueltas = 0, total = 0;

  for (const sel of catalogo.selecciones) {
    for (const jug of sel.jugadores) {
      total++;
      if (overrides[jug.nombre]) {
        jug.imagenUrl = overrides[jug.nombre];
        resueltas++;
        continue;
      }
      try {
        const url = await resolvePlayer(jug.nombre, sel.nombre);
        jug.imagenUrl = url;
        if (url) resueltas++;
      } catch (e) {
        jug.imagenUrl = jug.imagenUrl ?? null;
        console.warn(`error ${jug.nombre}: ${e.message}`);
      }
      await sleep(400); // throttle del tier free
    }
  }

  await writeFile(JSON_PATH, JSON.stringify(catalogo, null, 2) + '\n', 'utf8');
  console.log(`Cobertura: ${resueltas}/${total} (${(100 * resueltas / total).toFixed(1)}%)`);
}

main();
```

- [ ] **Step 3: Crear `scripts/figuritas/README.md`**:

```markdown
# Resolver de imágenes de figuritas

Rellena `imagenUrl` de cada jugador en
`backend/src/main/resources/data/figuritas-mundial-2026.json` consultando TheSportsDB
**una sola vez** (offline). El backend no llama a la API: solo lee el JSON enriquecido.

## Uso

```bash
# key "3" es la de prueba pública; si está limitada, sacá una free en thesportsdb.com
SPORTSDB_KEY=3 node scripts/figuritas/resolve-images.mjs
```

Imprime la cobertura (% de jugadores con foto). Los que no resuelven quedan con
`imagenUrl: null` y usan el fallback del front.

## Correcciones manuales

Editá `overrides.json` con `{ "Nombre Jugador": "https://url/foto.png" }` para forzar
o corregir una foto, y volvé a correr el script.

> Esta carpeta está gitignored. Lo que se commitea es el JSON ya enriquecido.
```

- [ ] **Step 4: Correr el resolver** (una vez)

Run: `SPORTSDB_KEY=3 node scripts/figuritas/resolve-images.mjs`
Expected: imprime `Cobertura: X/Y (Z%)` y reescribe el JSON con URLs donde encontró foto.
Si la key "3" devuelve 0%/errores, obtener una key free en thesportsdb.com y reintentar.

- [ ] **Step 5: Verificar que el dataset sigue siendo válido**

Run: `cd backend && ./mvnw test -Dtest=CatalogoDatasetTest`
Expected: PASS (el enriquecido no rompe el esquema; `imagenUrl` puede ser string o null).

- [ ] **Step 6: Commit** (solo el JSON enriquecido; `/scripts/` no se trackea)

```bash
git add backend/src/main/resources/data/figuritas-mundial-2026.json
git commit -m "feat(catalogo): fotos reales de jugadores (TheSportsDB) en el dataset"
```

---

## Task 7: Adaptar `DemoSeedService` al catálogo real

**Files:**
- Modify: `backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java`
- Test: `backend/src/test/java/com/grupo3/tp/service/DemoSeedServiceTest.java`

**Interfaces:**
- Consumes: `CatalogoService.cargarDesdeJson()`; `FiguritaBaseRepository.findAll()`.
- Produces: `DemoSeedService.primerasBasesPorNumero(int) -> Map<Integer, FiguritaBase>`; `seed()` ahora usa el catálogo real.

- [ ] **Step 1: Escribir el test que falla** — en `DemoSeedServiceTest.java`, agregar mocks y un test del helper. Reemplazar la cabecera de la clase (campos `@Mock`/`@InjectMocks`) por:

```java
    @Mock MongoTemplate mongoTemplate;
    @Mock PasswordEncoder passwordEncoder;
    @Mock com.grupo3.tp.repository.FiguritaBaseRepository figuritaBaseRepo;
    @Mock CatalogoService catalogoService;
    @InjectMocks DemoSeedService service;
```

Y agregar este test antes del cierre de la clase:

```java
    @Test
    void primerasBasesPorNumeroTomaElSubsetUnoAN() {
        var b1   = com.grupo3.tp.models.FiguritaBase.builder().id("b1").numero(1).build();
        var b48  = com.grupo3.tp.models.FiguritaBase.builder().id("b48").numero(48).build();
        var b49  = com.grupo3.tp.models.FiguritaBase.builder().id("b49").numero(49).build();
        when(figuritaBaseRepo.findAll()).thenReturn(java.util.List.of(b1, b48, b49));

        var sub = service.primerasBasesPorNumero(48);

        assertEquals(2, sub.size());
        assertTrue(sub.containsKey(1));
        assertTrue(sub.containsKey(48));
        assertFalse(sub.containsKey(49));
    }
```

Asegurar el import: `import static org.mockito.Mockito.when;` (ya está `org.mockito.Mockito.*`).

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedServiceTest#primerasBasesPorNumeroTomaElSubsetUnoAN`
Expected: FAIL de compilación — `primerasBasesPorNumero` no existe y el constructor aún no recibe `CatalogoService`.

- [ ] **Step 3: Modificar el constructor de `DemoSeedService`** — quitar los repos `seleccionRepo`, `equipoRepo`, `jugadorRepo`, `categoriaRepo` (solo los usaba `seedCatalogo`) y agregar `CatalogoService`.

Quitar estos campos (líneas ~64-67):
```java
    private final SeleccionRepository seleccionRepo;
    private final EquipoRepository equipoRepo;
    private final JugadorRepository jugadorRepo;
    private final CategoriaFiguritaRepository categoriaRepo;
```
y agregar:
```java
    private final CatalogoService catalogoService;
```

En el constructor, quitar los 4 params correspondientes (`SeleccionRepository seleccionRepo, EquipoRepository equipoRepo, JugadorRepository jugadorRepo, CategoriaFiguritaRepository categoriaRepo,`) y sus asignaciones, y agregar el param `CatalogoService catalogoService` con `this.catalogoService = catalogoService;`.

- [ ] **Step 4: Borrar `seedCatalogo()` y agregar `primerasBasesPorNumero()`** — eliminar todo el método `Map<Integer, FiguritaBase> seedCatalogo() { ... }` (líneas ~151-396) y en su lugar agregar:

```java
    /**
     * Subset determinístico del catálogo real para la demo: mapa numero -> FiguritaBase
     * con las bases 1..n. Como Argentina es la 1ª selección del JSON, las bases 1..18 son
     * de Argentina (coherente con la subasta "Solo Argentina" del escenario de demo).
     */
    Map<Integer, FiguritaBase> primerasBasesPorNumero(int n) {
        Map<Integer, FiguritaBase> porNumero = new HashMap<>();
        for (FiguritaBase fb : figuritaBaseRepo.findAll()) {
            if (fb.getNumero() != null && fb.getNumero() >= 1 && fb.getNumero() <= n) {
                porNumero.put(fb.getNumero(), fb);
            }
        }
        return porNumero;
    }
```

- [ ] **Step 5: Actualizar `seed()`** — cambiar las 2 primeras líneas tras `reset();`:

De:
```java
        reset();
        Map<Integer, FiguritaBase> bases = seedCatalogo();
        Map<String, Usuario> users = seedUsuarios();
```
a:
```java
        reset();
        catalogoService.cargarDesdeJson();
        Map<Integer, FiguritaBase> bases = primerasBasesPorNumero(48);
        Map<String, Usuario> users = seedUsuarios();
```

Quitar el import ahora sin uso `import java.util.Arrays;`. (Dejar `HashMap`, `List`, `Map`, etc.)

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `cd backend && ./mvnw test -Dtest=DemoSeedServiceTest`
Expected: PASS (los 3 tests: reset, buildUser, primerasBasesPorNumero).

- [ ] **Step 7: Compilar el backend completo** (asegurar que nada más referenciaba `seedCatalogo` o los repos quitados)

Run: `cd backend && ./mvnw clean package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/grupo3/tp/service/DemoSeedService.java \
        backend/src/test/java/com/grupo3/tp/service/DemoSeedServiceTest.java
git commit -m "refactor(demo): seed-demo arma el escenario sobre el catálogo real"
```

---

## Task 8: Frontend — render de la foto con fallback

**Files:**
- Modify: `frontend/src/hooks/useFiguritas.ts`
- Modify: `frontend/src/types/dashboard.ts`
- Modify: `frontend/src/pages/coleccion/components/TarjetaColeccion.tsx`
- Modify: `frontend/src/pages/coleccion/TodasPage.tsx`, `FaltantesPage.tsx`, `RepetidasPage.tsx`
- Test: `frontend/src/pages/coleccion/components/TarjetaColeccion.test.tsx`

**Interfaces:**
- Consumes: campo `imagenUrl` que ahora devuelve el backend (Task 1).
- Produces: `TarjetaColeccion` acepta `imagenUrl?: string | null`.

- [ ] **Step 1: Escribir el test que falla** — `TarjetaColeccion.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TarjetaColeccion from './TarjetaColeccion';

describe('TarjetaColeccion', () => {
  it('renderiza la imagen cuando hay imagenUrl', () => {
    render(
      <TarjetaColeccion
        seleccionNombre="Argentina" jugadorNombre="Lionel Messi"
        equipoNombre="Inter Miami" categoriaNombre="Oro"
        imagenUrl="https://img/messi.png"
      />,
    );
    const img = screen.getByRole('img', { name: 'Lionel Messi' });
    expect(img.getAttribute('src')).toBe('https://img/messi.png');
  });

  it('muestra el placeholder cuando no hay imagenUrl', () => {
    render(
      <TarjetaColeccion
        seleccionNombre="Argentina" jugadorNombre="Lionel Messi"
        equipoNombre="Inter Miami" categoriaNombre="Oro"
      />,
    );
    expect(screen.getByText('Imagen')).toBeDefined();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd frontend && npx vitest run src/pages/coleccion/components/TarjetaColeccion.test.tsx`
Expected: FAIL — la imagen no se renderiza (la tarjeta aún ignora `imagenUrl`).

- [ ] **Step 3: Actualizar `TarjetaColeccion.tsx`** — reemplazar el archivo completo por:

```tsx
import { useState, type ReactNode } from 'react';

interface TarjetaColeccionProps {
  seleccionNombre: string;
  jugadorNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  /** Foto real del jugador; si falta o falla la carga, se muestra el placeholder. */
  imagenUrl?: string | null;
  /** Contenido del pie de la tarjeta: badge de cantidad, número, etc. */
  footer?: ReactNode;
  /** Si se provee, la tarjeta es clickeable (cursor + hover). */
  onClick?: () => void;
}

/**
 * Tarjeta de figurita reutilizable en las vistas de "Mi Colección".
 * El contenido variable (badge de cantidad vs. número de figurita) se pasa por `footer`.
 */
export default function TarjetaColeccion({
  seleccionNombre, jugadorNombre, equipoNombre, categoriaNombre, imagenUrl, footer, onClick,
}: TarjetaColeccionProps) {
  const clickable = typeof onClick === 'function';
  const [imgError, setImgError] = useState(false);
  const mostrarImagen = !!imagenUrl && !imgError;

  return (
    <div
      data-testid="figurita-card"
      onClick={onClick}
      className={
        'bg-surface p-4 rounded-lg border border-border flex flex-col ' +
        (clickable ? 'cursor-pointer hover:bg-surface/80 transition-colors' : '')
      }
    >
      <div className="w-full aspect-square bg-surface2 rounded-md mb-3 flex items-center justify-center overflow-hidden">
        {mostrarImagen ? (
          <img
            src={imagenUrl!}
            alt={jugadorNombre}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <p className="text-xs text-muted">Imagen</p>
        )}
      </div>
      <p className="text-xs text-muted mb-2">{seleccionNombre}</p>
      <p className="text-sm font-bold text-primary mb-2">{jugadorNombre}</p>
      <p className="text-xs text-text mb-2">{equipoNombre}</p>
      <p className="text-xs text-muted mb-3">{categoriaNombre}</p>
      {footer && <div className="mt-auto">{footer}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd frontend && npx vitest run src/pages/coleccion/components/TarjetaColeccion.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Agregar `imagenUrl` a los tipos** — en `frontend/src/hooks/useFiguritas.ts`, agregar a la interface `FiguritaResponseDTO` (tras `ownerName: string;`):

```ts
  imagenUrl?: string | null;
```

y a la interface `FiguritaBaseDTO` (tras `categoriaNombre: string;`):

```ts
  imagenUrl?: string | null;
```

En `frontend/src/types/dashboard.ts`, agregar a la interface `FiguritaResponseDTO` (tras `ownerName: string;`):

```ts
  imagenUrl?: string | null;
```

- [ ] **Step 6: Pasar `imagenUrl` a la tarjeta en las 3 páginas** — en `TodasPage.tsx`, `FaltantesPage.tsx` y `RepetidasPage.tsx`, agregar el prop `imagenUrl={f.imagenUrl}` a cada `<TarjetaColeccion ...>` (junto a `categoriaNombre={f.categoriaNombre}`). Ejemplo en `TodasPage.tsx`:

```tsx
          <TarjetaColeccion
            key={f.figuritaBaseId}
            seleccionNombre={f.seleccionNombre}
            jugadorNombre={f.jugadorNombre}
            equipoNombre={f.equipoNombre}
            categoriaNombre={f.categoriaNombre}
            imagenUrl={f.imagenUrl}
            footer={
              <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                x{f.count}
              </span>
            }
          />
```

(Idéntico agregado de `imagenUrl={f.imagenUrl}` en `FaltantesPage.tsx` y `RepetidasPage.tsx`.)

- [ ] **Step 7: Verificar typecheck/build y tests del front**

Run: `cd frontend && npm run build && npx vitest run`
Expected: build OK (tsc sin errores) y todos los tests verdes.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/hooks/useFiguritas.ts \
        frontend/src/types/dashboard.ts \
        frontend/src/pages/coleccion/components/TarjetaColeccion.tsx \
        frontend/src/pages/coleccion/components/TarjetaColeccion.test.tsx \
        frontend/src/pages/coleccion/TodasPage.tsx \
        frontend/src/pages/coleccion/FaltantesPage.tsx \
        frontend/src/pages/coleccion/RepetidasPage.tsx
git commit -m "feat(coleccion): mostrar foto real de la figurita con fallback"
```

---

## Task 9: Test e2e con Puppeteer (verifica todo en el browser)

**Files:**
- Modify: `frontend/package.json` (devDependency `puppeteer` + script `e2e`)
- Create: `frontend/e2e/figuritas.e2e.mjs`

**Interfaces:**
- Consumes: `data-testid="figurita-card"` que agregó Task 8; rutas `/login`, `/coleccion`, `/coleccion/faltantes`; el escenario que crea `seed-demo` (usuario `juanca`/`demo1234`).
- Produces: comando `npm run e2e` que falla (exit ≠ 0) si el catálogo real o las fotos no están funcionando.

**Qué verifica de punta a punta:** que el catálogo grande se cargó (faltantes ≈ 850), que aparecen datos reales (`Argentina`), y que el `imagenUrl` viaja del backend al `<img src>` del front (prueba modelo→DTO→service→front + resolver). Las imágenes se stubbean a nivel de red para no depender del CDN de TheSportsDB ni volver lento el test; lo que se asserta es que la **URL real** quedó en el DOM.

- [ ] **Step 1: Levantar la app y sembrar la demo** (precondición del e2e)

```bash
docker compose up --build -d
# loguearse como admin y disparar seed-demo (crea juanca + colección):
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"adminpass123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s -X POST http://localhost/api/admin/seed-demo -H "Authorization: Bearer $TOKEN" | head -c 300
```
Expected: la respuesta del seed muestra `"figuritasBase":` con ~850 y credenciales de `juanca`.
(Si `admin` no existe aún porque la base estaba vacía, registralo primero en `/register` con username `admin`; por la convención del backend ese username obtiene rol ADMIN.)

- [ ] **Step 2: Instalar Puppeteer y agregar el script** — en `frontend/`:

```bash
cd frontend && npm install -D puppeteer
```

Agregar a `frontend/package.json`, en `"scripts"`, la entrada:

```json
    "e2e": "node e2e/figuritas.e2e.mjs"
```

- [ ] **Step 3: Escribir el test e2e** — `frontend/e2e/figuritas.e2e.mjs`:

```js
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
```

- [ ] **Step 4: Correr el e2e y verificar que pasa**

Run: `cd frontend && BASE_URL=http://localhost npm run e2e`
Expected: imprime `OK — Todas: N figuritas, Faltantes: M (con foto: K)` y sale con código 0.
(Si el frontend local corre en otro puerto/origen — p. ej. `npm run dev` en 5173 o port 80 ocupado por Apache → 8090 — pasarlo por `BASE_URL`.)

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/e2e/figuritas.e2e.mjs
git commit -m "test(e2e): verificación con Puppeteer del catálogo real y fotos"
```

---

## Verificación end-to-end (manual, tras todas las tareas)

- [ ] **Levantar la app con base vacía** y confirmar que el catálogo se carga solo:

```bash
docker compose up --build -d
docker compose logs backend | grep "Catálogo cargado"
```
Expected: log `Catálogo cargado: 48 selecciones, ~850 figuritas base.`

- [ ] **Reiniciar el backend** y confirmar idempotencia: el log dice `Catálogo ya presente; se omite la carga inicial.` (no duplica).

- [ ] **Loguear como admin y correr seed-demo** (`POST /api/admin/seed-demo`); confirmar en la respuesta `figuritasBase ≈ 850`, y que juanca tiene repetidas, sugerencias, intercambios y subastas. En `/coleccion` y `/buscar` las tarjetas muestran fotos donde hay y placeholder donde no.

---

## Self-Review (cobertura del spec)

- **Sección 1 (JSON commiteado):** Task 5 (dataset) + Task 2 (esquema/records). ✓
- **Sección 2 (resolver offline de imágenes):** Task 6. ✓
- **Sección 3 (CatalogoService):** Task 3. ✓
- **Sección 4 (carga idempotente al arrancar):** Task 4. ✓
- **Sección 5 (modelo/DTO/frontend para la foto):** Task 1 (back) + Task 8 (front). ✓
- **Sección 6 (DemoSeedService adaptado):** Task 7. ✓
- **Verificación e2e en browser (Puppeteer):** Task 9 — login juanca, colección con datos reales, faltantes con catálogo grande y fotos wireadas. ✓
- **Performance N+1:** explícitamente fuera de alcance (fast-follow), no hay task — correcto.
- **Constraint Argentina-primera:** codificada en Global Constraints, asegurada por el test de Task 5 y consumida por Task 7. ✓
- **Riesgos aceptados (licencia/cobertura/link rot):** materializados en el fallback (Task 8) y el resolver con overrides (Task 6). ✓
