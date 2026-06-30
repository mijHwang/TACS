package com.grupo3.tp.service;

import com.grupo3.tp.dtos.SubastaDTO;
import com.grupo3.tp.dtos.OfertaDTO;
import com.grupo3.tp.dtos.DemoSeedResultDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.grupo3.tp.models.Figurita;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
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

    /** Las 15 colecciones de la app, a vaciar en el reset. */
    public static final String[] COLECCIONES = {
        "usuarios", "figuritas", "figuritas_base", "categorias_figurita", "condiciones",
        "equipos", "jugadores", "selecciones", "intercambios", "notificaciones",
        "ofertas", "solicitudes_intercambio", "subastas", "sugerencias", "calificaciones"
    };

    static final String PASS_DEMO = "demo1234";
    static final String PASS_ADMIN = "adminpass123";
    static final String PROTAGONISTA = "juanca";
    static final List<String> CONTRAPARTES = List.of(
            "sofia", "mateo", "valen", "cami", "nico",
            "lucas", "martina", "thiago", "agus", "flor");

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

    private final MongoTemplate mongoTemplate;
    private final PasswordEncoder passwordEncoder;
    private final SeleccionRepository seleccionRepo;
    private final EquipoRepository equipoRepo;
    private final JugadorRepository jugadorRepo;
    private final CategoriaFiguritaRepository categoriaRepo;
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

    public DemoSeedService(MongoTemplate mongoTemplate,
                           PasswordEncoder passwordEncoder,
                           SeleccionRepository seleccionRepo,
                           EquipoRepository equipoRepo,
                           JugadorRepository jugadorRepo,
                           CategoriaFiguritaRepository categoriaRepo,
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
                           FiguritaRepository figuritaRepo) {
        this.mongoTemplate = mongoTemplate;
        this.passwordEncoder = passwordEncoder;
        this.seleccionRepo = seleccionRepo;
        this.equipoRepo = equipoRepo;
        this.jugadorRepo = jugadorRepo;
        this.categoriaRepo = categoriaRepo;
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
     * Crea el catálogo base (selecciones, categorías, equipos, jugadores y 48 figuritas_base
     * numeradas 1..48). Reutiliza los datos del antiguo FiguritaBaseSeeder.
     * @return mapa numero -> FiguritaBase para usar al armar colecciones.
     */
    Map<Integer, FiguritaBase> seedCatalogo() {
        Map<Integer, FiguritaBase> porNumero = new HashMap<>();

        // Save Selecciones
        Seleccion arg = seleccionRepo.save(new Seleccion(null, "Argentina", "CONMEBOL"));
        Seleccion bra = seleccionRepo.save(new Seleccion(null, "Brazil", "CONMEBOL"));

        // Save Categorias
        CategoriaFigurita oro = categoriaRepo.save(new CategoriaFigurita(null, "Oro"));
        CategoriaFigurita plata = categoriaRepo.save(new CategoriaFigurita(null, "Plata"));
        CategoriaFigurita bronce = categoriaRepo.save(new CategoriaFigurita(null, "Bronce"));
        List<CategoriaFigurita> categorias = Arrays.asList(oro, plata, bronce);

        // Save Argentina Equipos
        Equipo boca = equipoRepo.save(new Equipo(null, "Boca Juniors"));
        Equipo river = equipoRepo.save(new Equipo(null, "River Plate"));
        Equipo racing = equipoRepo.save(new Equipo(null, "Racing Club"));
        Equipo sanLorenzo = equipoRepo.save(new Equipo(null, "San Lorenzo"));
        Equipo independiente = equipoRepo.save(new Equipo(null, "Independiente"));

        // Save Brazil Equipos
        Equipo santos = equipoRepo.save(new Equipo(null, "Santos"));
        Equipo flamengo = equipoRepo.save(new Equipo(null, "Flamengo"));
        Equipo corinthians = equipoRepo.save(new Equipo(null, "Corinthians"));
        Equipo palmeiras = equipoRepo.save(new Equipo(null, "Palmeiras"));
        Equipo vasco = equipoRepo.save(new Equipo(null, "Vasco da Gama"));

        // Save European Equipos
        Equipo barcelona = equipoRepo.save(new Equipo(null, "Barcelona"));
        Equipo realMadrid = equipoRepo.save(new Equipo(null, "Real Madrid"));
        Equipo juventus = equipoRepo.save(new Equipo(null, "Juventus"));
        Equipo liverpool = equipoRepo.save(new Equipo(null, "Liverpool"));
        Equipo psg = equipoRepo.save(new Equipo(null, "Paris Saint-Germain"));
        Equipo acMilan = equipoRepo.save(new Equipo(null, "AC Milan"));
        Equipo manchesterCity = equipoRepo.save(new Equipo(null, "Manchester City"));

        // Save Argentina Jugadores
        Jugador maradona = jugadorRepo.save(new Jugador(null, "Diego Maradona"));
        Jugador aguero = jugadorRepo.save(new Jugador(null, "Sergio Aguero"));
        Jugador diMaria = jugadorRepo.save(new Jugador(null, "Angel Di Maria"));
        Jugador mascherano = jugadorRepo.save(new Jugador(null, "Javier Mascherano"));
        Jugador higuain = jugadorRepo.save(new Jugador(null, "Gonzalo Higuain"));
        Jugador banega = jugadorRepo.save(new Jugador(null, "Ever Banega"));
        Jugador otamendi = jugadorRepo.save(new Jugador(null, "Nicolas Otamendi"));
        Jugador tevez = jugadorRepo.save(new Jugador(null, "Carlos Tevez"));

        // Save Brazil Jugadores
        Jugador ronaldo = jugadorRepo.save(new Jugador(null, "Ronaldo"));
        Jugador ronaldinho = jugadorRepo.save(new Jugador(null, "Ronaldinho"));
        Jugador neymar = jugadorRepo.save(new Jugador(null, "Neymar"));
        Jugador kaka = jugadorRepo.save(new Jugador(null, "Kaka"));
        Jugador robinho = jugadorRepo.save(new Jugador(null, "Robinho"));
        Jugador thiagoSilva = jugadorRepo.save(new Jugador(null, "Thiago Silva"));
        Jugador coutinho = jugadorRepo.save(new Jugador(null, "Philippe Coutinho"));
        Jugador marcelo = jugadorRepo.save(new Jugador(null, "Marcelo"));

        // Create Argentina figuritas (8 jugadores × 3 categorías = 24 figuritas)
        int numero = 1;

        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(maradona)
                    .seleccion(arg)
                    .equipo(boca)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(aguero)
                    .seleccion(arg)
                    .equipo(manchesterCity)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(diMaria)
                    .seleccion(arg)
                    .equipo(realMadrid)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(mascherano)
                    .seleccion(arg)
                    .equipo(barcelona)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(higuain)
                    .seleccion(arg)
                    .equipo(juventus)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(banega)
                    .seleccion(arg)
                    .equipo(sanLorenzo)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(otamendi)
                    .seleccion(arg)
                    .equipo(juventus)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(tevez)
                    .seleccion(arg)
                    .equipo(manchesterCity)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }

        // Create Brazil figuritas (8 jugadores × 3 categorías = 24 figuritas)
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(ronaldo)
                    .seleccion(bra)
                    .equipo(realMadrid)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(ronaldinho)
                    .seleccion(bra)
                    .equipo(barcelona)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(neymar)
                    .seleccion(bra)
                    .equipo(psg)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(kaka)
                    .seleccion(bra)
                    .equipo(acMilan)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(robinho)
                    .seleccion(bra)
                    .equipo(manchesterCity)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(thiagoSilva)
                    .seleccion(bra)
                    .equipo(psg)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(coutinho)
                    .seleccion(bra)
                    .equipo(liverpool)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }
        for (CategoriaFigurita cat : categorias) {
            FiguritaBase fb = figuritaBaseRepo.save(FiguritaBase.builder()
                    .numero(numero)
                    .jugador(marcelo)
                    .seleccion(bra)
                    .equipo(realMadrid)
                    .categoria(cat)
                    .build());
            porNumero.put(numero, fb);
            numero++;
        }

        // porNumero now holds entries 1..48 (16 players × 3 categories each)
        return porNumero;
    }

    /**
     * Crea admin + protagonista + 10 contrapartes.
     * @return mapa username -> Usuario persistido.
     */
    Map<String, Usuario> seedUsuarios() {
        Map<String, Usuario> users = new LinkedHashMap<>();
        users.put("admin", usuarioService.crear(buildUser("admin", PASS_ADMIN, Role.ADMIN)));
        users.put(PROTAGONISTA, usuarioService.crear(buildUser(PROTAGONISTA, PASS_DEMO, Role.USER)));
        for (String name : CONTRAPARTES) {
            users.put(name, usuarioService.crear(buildUser(name, PASS_DEMO, Role.USER)));
        }
        return users;
    }

    /**
     * Crea las instancias de figurita de cada usuario según MATRIZ.
     * @param users mapa username -> Usuario (debe contener todas las claves de MATRIZ).
     * @param bases mapa numeroBase -> FiguritaBase (debe contener todas las bases referenciadas en MATRIZ).
     * @return mapa username -> mapa numeroBase -> lista de instancias Figurita poseídas.
     */
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
}
