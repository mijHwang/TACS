# TACS — TP Grupo 3


## Descripción del Proyecto

**TACS** es una plataforma para el intercambio de figuritas del Mundial de Fútbol 2026.

**Propósito:** Facilitar que los usuarios publiquen figuritas repetidas, busquen coincidencias 
con otros usuarios, realicen propuestas de intercambio, completen operaciones dentro de la plataforma y publiquen subastas de figuritas repetidas

**Funcionalidades principales:**

- Autenticación y gestión de cuentas
- Búsqueda y filtrado de figuritas disponibles
- Propuestas de intercambio entre usuarios
- Gestión de propuestas (aceptar/rechazar)
- Colección personal y tracking de figuritas
- Notificaciones de actividad
- Historial de intercambios completados
- Subastas de figuritas (crear, listar, participar, pujar)

**Roadmap:**
Subastas (parcialmente), sugerencias automáticas, sistema de reputación, alertas de figuritas faltantes.

## Equipo

- Hwang, Min Jun
- Sicher, Matias
- Abascal, Nicolas

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Docker | 24+ |
| Docker Compose | v2 (incluido en Docker Desktop) |

---

## Cómo levantar la aplicación

```bash
# Desde la raíz del repositorio
docker compose up --build
```

### Online (AWS)
La aplicación está alojada en una instancia AWS:
```
http://34.195.221.240/
```

| URL | Descripción |
|---|---|
| `http://localhost` | Aplicación web (frontend) |
| `http://localhost:8080/api/health` | Health check del backend |

### Usuarios de prueba

> El sistema usa persistencia en memoria. Los datos se reinician al bajar los contenedores.

Se puede crear usuarios a través del formulario de registro en la UI.

### Comandos útiles

```bash
# Levantar en background
docker compose up --build -d

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend

# Bajar todo y eliminar contenedores
docker compose down
```

---

### Componentes

| Servicio | Tecnología | Puerto |
|---|---|---|
| **frontend** | React 19 + Vite + TailwindCSS 4 → build estático servido por Nginx | 80 |
| **backend** | Spring Boot 4 + Java 21 + Lombok | 8080 |
|**persistencia**|Mongo Atlas Cloud|DB nombre: tacs |

Ambos corren en una red Docker interna (`tacs-net`). El frontend **nunca habla directamente con el backend desde el browser** — todo pasa por el proxy de Nginx. Esto elimina problemas de CORS.

---

## Decisiones de diseño

### Backend

- **Arquitectura en capas**: `Controller → Service → Repository`, separando responsabilidades y facilitando el testing unitario de cada capa y posterior migrado a microservicios.
- **Spring Boot 4 / Java 21**: se eligió la versión más reciente estable.
- DTOs para respuestas serializadas [NEW: Document pattern used in Subastas]
  Ejemplo: FiguritaResponseDTO para evitar serializar IDs sin resolver en la respuesta de /figuritas/repetidas
  Patrón: Repository devuelve DTO mapeado en lugar de entidades con referencias lazy
- Custom Repository Queries [NEW: Document pattern used]
  Ejemplo: FiguritaRepository.findRepetidas(usuarioId) con lógica de grouping y filtering en el repositorio

### Frontend

- **React 19 + Vite**: stack moderno, rápido en el desarrollo y buen rendimiento en builds.
- **TailwindCSS 4**: Nos permite iterar en la UI sin escribir CSS custom.
- **Lazy loading de páginas**: todas las páginas se importan con `React.lazy()` para que solo se descarguen cuando el usuario las visita.
- **Roles de usuario**: `PrivateRoute` soporta un `requiredRole` opcional. La ruta `/admin` solo es accesible para usuarios con rol `admin`.

### Persistencia

- **MongoDB**: A highly scalable, document-oriented NoSQL database that stores data in JSON-like formats.
- **Cluster**: cluster0.nqxun4d.mongodb.net
- **Database**: tacs
- **Connection**: mongodb+srv://test:<db_password>@cluster0.nqxun4d.mongodb.net/tacs?appName=Cluster0

**Colecciones**
El sistema actualmente utiliza las siguientes colecciones en MongoDB:

- `usuarios` — Cuentas de usuario
- `figuritas` — Instancias de figuritas (con propietario)
- `figuritas_base` — Definición base de figuritas
- `solicitudes_intercambio` — Propuestas de intercambio
- `intercambios` — Intercambios completados
- `notificaciones` — Notificaciones para usuarios
- `subastas` — Subastas de figuritas (WIP) 
- `ofertas` — Ofertas/pujas en subastas (WIP) 
- Datos de referencia: `selecciones`, `equipos`, `jugadores`, `categorias_figurita`



## Testing

**Status**: [WIP] En desarrollo

Estrategia:
- Tests unitarios para services (lógica de negocio) usando mocks de repositories
- Integration tests para flujos críticos (propuestas, intercambios)
- Spring Data MongoDB tested implícitamente a través de integration tests
- Coverage target: 70%+ en services

## Seguridad

**Status**: [WIP] Por documentar

Notas para próxima revisión:
- Revisar estrategia de DTOs implementada
- Documentar gestión de contraseñas (BCrypt)
- Verificar variables de entorno para credenciales


---

## Uso de IA

Durante el desarrollo se utilizó **Claude Sonnet 4.6** como asistente de pair programming para:

- Desarrollo de los endpoints del backend.
- Desarrollo de las interfaces de usuario de frontend.
- Configuración de la infraestructura (Dockerfiles y docker-compose).
- Generación de estructuras base y código repetitivo.
- Validación de ideas y decisiones de diseño (principalmente UI).
- Implemetación de la persistencia.

La herramienta fue utilizada como apoyo, manteniendo revisión y adaptación manual del código generado.
---

## 📁 Estructura del proyecto

```
TACS/
├── backend/                  # Spring Boot
│   ├── src/main/java/...
│   │   ├── controller/       # REST controllers
│   │   ├── service/          # Lógica de negocio
│   │   ├── repository/       # Persistencia en memoria
│   │   └── models/           # Entidades del dominio
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── pages/            # Páginas por feature (subastas, colección, etc.)
│   │   ├── components/       # Componentes reutilizables
│   │   ├── services/         # Llamadas a la API + mappers
│   │   ├── types/            # Tipos TypeScript del dominio
│   │   └── router/           # Definición de rutas
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```


