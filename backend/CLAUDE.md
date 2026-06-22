# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Commands

```bash
./mvnw clean package -DskipTests   # Build JAR
./mvnw test                          # Run all tests
./mvnw test -Dtest=ClassName#method  # Run single test
```

## Package Structure

`com.grupo3.tp.{configs, controller, dtos, models, repository, service, utils}`

- `configs/` — `SecurityConfig`, `CorsConfig`
- `utils/` — `JwtService` (token gen/validation), `JwtAuthenticationFilter` (per-request filter)
- `dtos/` — thin request/response objects (`LoginRequestDTO`, `Usuariodto`, `PlatformStatsDTO`)

## Adding a New Endpoint

Four files, always in this order:

**1. Model** — `models/NewEntity.java`
```java
@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Document(collection = "newentities")
public class NewEntity {
    @Id
    private String id; // String ObjectId assigned by MongoDB on save
    // ... fields
    // Use @DocumentReference(lazy = true) for references to other entities
}
```

**2. Repository** — `repository/NewEntityRepository.java`
```java
@Repository
public interface NewEntityRepository extends MongoRepository<NewEntity, String> {
    // save/findById/findAll/deleteById/existsById come from MongoRepository
    // Add derived queries as needed, e.g. Optional<NewEntity> findByName(String name);
    // For complex queries, add a *RepositoryCustom interface + *Impl using MongoTemplate
}
```

**3. Service** — `service/NewEntityService.java`
```java
@Service
public class NewEntityService {
    // Standard: crear, obtenerPorId, obtenerTodos, actualizar, eliminar
    // Methods named in Spanish — keep consistent with existing services
}
```

**4. Controller** — `controller/NewEntityController.java`
```java
@RestController
@RequestMapping("/api/newentities")
public class NewEntityController {
    // GET list → 200, GET by id → 200/404
    // POST → ResponseEntity with HttpStatus.CREATED (201)
    // PUT → 200/404
    // DELETE → ResponseEntity.noContent() (204) or 404
}
```

## Security & JWT

- All endpoints except `/auth/login` and `/auth/register` require a valid JWT (enforced by `SecurityConfig`).
- `JwtAuthenticationFilter` runs once per request: extracts username + roles from `Authorization: Bearer` header, sets `SecurityContextHolder`.
- Passwords are hashed with **BCrypt** (`BCryptPasswordEncoder` bean in `SecurityConfig`); `AuthController.register()` stores `passwordEncoder.encode(...)`, never plaintext.
- JWT secret is injected from the **`JWT_SECRET` env var** (bound to `jwt.secret` in `application.properties` / `application-docker.properties`) — **not** hardcoded. Signed HS256. Token expiration: **24 h** (`jwt.expiration-ms`, default 86400000). In `docker`/prod the app fails to start if `JWT_SECRET` is unset (intentional); local dev has a throwaway default.
- Admin-only endpoints use `@PreAuthorize("hasRole('ADMIN')")`.
- **Role assignment quirk:** in `AuthController.register()`, the username `"admin"` automatically gets `Role.ADMIN`. All other users get `Role.USER`.

## Persistence (MongoDB Atlas)

Data is persisted in MongoDB Atlas via Spring Data MongoDB. Repositories are interfaces extending `MongoRepository<Entity, String>`; models are annotated with `@Document(collection = "...")` and `@Id`. Cross-entity references use `@DocumentReference(lazy = true)`. Complex queries live in a `*RepositoryCustom` interface with a `*Impl` class backed by `MongoTemplate` (see `FiguritaRepositoryCustomImpl`, `NotificacionRepositoryImpl`, `SolicitudDeIntercambioRepositoryImpl`).

The connection string comes from `SPRING_MONGODB_URI` (set in the repo-root `.env`, injected by `docker-compose.yml`). The `docker` Spring profile (`application-docker.properties`) binds it via `spring.mongodb.uri`. Reaching Atlas requires the running machine's public IP in the cluster's Network Access list and valid Database Access credentials. Data **persists across restarts** (it's a real database, not in-memory).

## Model Conventions

All entities use `@Data @NoArgsConstructor @AllArgsConstructor @Builder` (Lombok), are annotated `@Document` with a `@Id private String id` assigned by MongoDB on save. `Usuario` implements `UserDetails` for Spring Security — `getAuthorities()` defaults to `ROLE_USER` if `role` is null.

**Not real entities (stubs):** `Sugerencia`/`GestionadorSugerencias` and `Alerta`/`GeneradorAlerta` under `models/` are plain POJOs (no `@Document`, no `@Id`); their generator methods `return null` and have no repository/service/controller. They are placeholders for US4/US11-proactive, not working features.

## CORS

Configured permissively in `CorsConfig` (all origins, all methods, all headers). In production this should be restricted.
