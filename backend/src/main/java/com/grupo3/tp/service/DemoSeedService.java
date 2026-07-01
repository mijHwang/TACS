package com.grupo3.tp.service;

import com.grupo3.tp.dtos.SubastaDTO;
import com.grupo3.tp.dtos.OfertaDTO;
import com.grupo3.tp.dtos.DemoSeedResultDTO;
import com.grupo3.tp.dtos.FiguritaPublicadaRequestDTO;
import com.grupo3.tp.dtos.FiguritaPublicadaResponseDTO;
import com.grupo3.tp.dtos.ProtagonistaDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.grupo3.tp.models.Figurita;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Orquestador del reset + siembra de datos de demo (visualización/pruebas).
 * Código de demo, no de negocio: reusa los services del dominio para que los
 * efectos colaterales (notificaciones, intercambios) ocurran como en uso real.
 */
@Service
public class DemoSeedService {

    /** Las 16 colecciones de la app, a vaciar en el reset. */
    public static final String[] COLECCIONES = {
        "usuarios", "figuritas", "figuritas_base", "categorias_figurita", "condiciones",
        "equipos", "jugadores", "selecciones", "intercambios", "notificaciones",
        "ofertas", "solicitudes_intercambio", "subastas", "sugerencias", "calificaciones",
        "figuritas_publicadas"
    };

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

    private final MongoTemplate mongoTemplate;
    private final PasswordEncoder passwordEncoder;
    private final CatalogoService catalogoService;
    private final FiguritaBaseRepository figuritaBaseRepo;
    private final UsuarioService usuarioService;
    private final FiguritaService figuritaService;
    private final SolicitudDeIntercambioService solicitudService;
    private final SubastaService subastaService;
    private final OfertaService ofertaService;
    private final IntercambioRepository intercambioRepo;
    private final CalificacionService calificacionService;
    private final SugerenciaService sugerenciaService;
    private final SolicitudDeIntercambioRepository solicitudRepo;
    private final SubastaRepository subastaRepo;
    private final OfertaRepository ofertaRepo;
    private final SugerenciaRepository sugerenciaRepo;
    private final NotificacionRepository notificacionRepo;
    private final CalificacionRepository calificacionRepo;
    private final UsuarioRepository usuarioRepo;
    private final FiguritaRepository figuritaRepo;
    private final FiguritaPublicadaService figuritaPublicadaService;
    private final FiguritaPublicadaRepository figuritaPublicadaRepo;

    public DemoSeedService(MongoTemplate mongoTemplate,
                           PasswordEncoder passwordEncoder,
                           CatalogoService catalogoService,
                           FiguritaBaseRepository figuritaBaseRepo,
                           UsuarioService usuarioService,
                           FiguritaService figuritaService,
                           SolicitudDeIntercambioService solicitudService,
                           SubastaService subastaService,
                           OfertaService ofertaService,
                           IntercambioRepository intercambioRepo,
                           CalificacionService calificacionService,
                           SugerenciaService sugerenciaService,
                           SolicitudDeIntercambioRepository solicitudRepo,
                           SubastaRepository subastaRepo,
                           OfertaRepository ofertaRepo,
                           SugerenciaRepository sugerenciaRepo,
                           NotificacionRepository notificacionRepo,
                           CalificacionRepository calificacionRepo,
                           UsuarioRepository usuarioRepo,
                           FiguritaRepository figuritaRepo,
                           FiguritaPublicadaService figuritaPublicadaService,
                           FiguritaPublicadaRepository figuritaPublicadaRepo) {
        this.mongoTemplate = mongoTemplate;
        this.passwordEncoder = passwordEncoder;
        this.catalogoService = catalogoService;
        this.figuritaBaseRepo = figuritaBaseRepo;
        this.usuarioService = usuarioService;
        this.figuritaService = figuritaService;
        this.solicitudService = solicitudService;
        this.subastaService = subastaService;
        this.ofertaService = ofertaService;
        this.intercambioRepo = intercambioRepo;
        this.calificacionService = calificacionService;
        this.sugerenciaService = sugerenciaService;
        this.solicitudRepo = solicitudRepo;
        this.subastaRepo = subastaRepo;
        this.ofertaRepo = ofertaRepo;
        this.sugerenciaRepo = sugerenciaRepo;
        this.notificacionRepo = notificacionRepo;
        this.calificacionRepo = calificacionRepo;
        this.usuarioRepo = usuarioRepo;
        this.figuritaRepo = figuritaRepo;
        this.figuritaPublicadaService = figuritaPublicadaService;
        this.figuritaPublicadaRepo = figuritaPublicadaRepo;
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

    /**
     * Helper: construye una solicitud (proponente pide {@code figuritaPedida}, ofrece {@code ofrecidas}) y la persiste.
     * Replica lo que hace el controller (estado PENDIENTE + destinatarioUsername) para reusar el
     * efecto colateral de notificación de SolicitudDeIntercambioService.crear().
     */
    SolicitudDeIntercambio crearSolicitud(Usuario proponente, Figurita figuritaPedida,
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

    /** Propuestas repartidas: D-5 se crean, D-4 se acepta/rechaza, D-3 deja pendientes, D-1 acepta. */
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

        // D-3: llegan 2 propuestas que quedan PENDIENTES accionables al D0 (reparto->juanca y juanca->reparto).
        // Se ubican en un día propio para que el feed de notificaciones abarque >=5 días distintos.
        timeline.enDia(timeline.dia(-3, 16), () -> {
            // cami pide la base 6 de juanca (RECIBIDA por juanca, pendiente)
            crearSolicitud(users.get("cami"), pool.tomar("juanca", 6),
                    List.of(pool.tomar("cami", 37)));
            // juanca pide la base 48 de martina (ENVIADA por juanca, pendiente)
            crearSolicitud(juanca, pool.tomar("martina", 48), List.of(pool.tomar("juanca", 9)));
        });

        // D-1: juanca propone a sofia y sofia acepta (intercambio cerrado + calificable)
        timeline.enDia(timeline.dia(-1, 18), () -> {
            SolicitudDeIntercambio juancaASofia = crearSolicitud(juanca, pool.tomar("sofia", 16),
                    List.of(pool.tomar("juanca", 5)));
            solicitudService.aceptar(juancaASofia.getId());
        });
    }

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
            // Marcar el intercambio como ya calificado por ambas partes: el front lo muestra
            // como "calificado" (no re-calificable) y evita un segundo conteo en la reputación.
            it.setPuntajeIntercambiador(5); // b (intercambiador) recibió 5 de a
            it.setPuntajeGenerador(4);      // a (generador) recibió 4 de b
            intercambioRepo.save(it);
        }
    }

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
}
