package com.grupo3.tp.service;

import com.grupo3.tp.dtos.SubastaDTO;
import com.grupo3.tp.dtos.SubastaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SubastaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;


@Service
public class SubastaService {

    private final SubastaRepository repository;
    private final FiguritaService figuritaService;
    private final NotificacionService notificacionService;
    private final UsuarioService usuarioService;



    public SubastaService(SubastaRepository repository,
                          FiguritaService figuritaService,
                          NotificacionService notificacionService,
                          UsuarioService usuarioService) {
        this.repository = repository;
        this.figuritaService = figuritaService;
        this.notificacionService = notificacionService;
        this.usuarioService = usuarioService;
    }

    public Subasta crear(SubastaDTO dto) {

        Usuario usuario = usuarioService.obtenerPorId(dto.getUsuarioId())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Figurita figurita = figuritaService.obtenerPorId(dto.getFiguritaId())
                .orElseThrow(() -> new RuntimeException("Figurita no encontrada"));



        Subasta subasta = Subasta.builder()
                .usuario(usuario)
                .figurita(figurita)
                .estado(EstadoSubasta.PENDIENTE)
                .duracion(dto.getDuracion())
                .condiciones(dto.getCondiciones())
                .build();


        if (subasta.getHoraInicio() == null) {
            subasta.setHoraInicio(LocalDateTime.now());
        }
        if (subasta.getDuracion() != null) {
            subasta.setHoraFin(subasta.getHoraInicio().plusHours(subasta.getDuracion()));
        }

        repository.save(subasta);

        return repository.findById(subasta.getId()).orElse(subasta);

    }

    @ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
    @Scheduled(fixedDelay = 60000)  // Run every 60 seconds
    public void finalizarSubastasExpiradas() {
        LocalDateTime ahora = LocalDateTime.now();

        List<Subasta> subastasExpiradas = repository.findByEstadoAndHoraFinBefore(EstadoSubasta.EN_CURSO, ahora);

        subastasExpiradas.forEach(s -> {
            try {
                finalizar(s.getId());
                System.out.println("Subasta " + s.getId() + " finalizada automáticamente");
            } catch (Exception e) {
                System.err.println("Error finalizando subasta " + s.getId() + ": " + e.getMessage());
            }
        });
    }

    public List<Subasta> obtenerPorUsuario(String usuarioId) {
        return repository.findByUsuarioId(usuarioId);
    }

    public List<Subasta> obtenerParticipando(String usuarioId) {
        return repository.findByParticipating(usuarioId);
    }


    public Optional<Subasta> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public List<Subasta> obtenerTodas() {
        return repository.findAll();
    }


    // FIXED: Added @Transactional to ensure atomicity when transferring figuritas
    // If any transfer fails, entire transaction rolls back
    @Transactional
    public void finalizar(String subastaId) {
        Subasta subasta = repository.findById(subastaId)
                .orElseThrow(() -> new RuntimeException("Subasta not found"));

        if (subasta.getEstado() == EstadoSubasta.FINALIZADA) {
            return;
        }

        if (subasta.getOfertas() == null || subasta.getOfertas().isEmpty()) {
            subasta.setEstado(EstadoSubasta.FINALIZADA);
            repository.save(subasta);
            return;
        }

        List<Oferta> ofertasValidas = filtrarOfertasValidas(subasta);

        if (ofertasValidas.isEmpty()) {
            subasta.setEstado(EstadoSubasta.FINALIZADA);
            repository.save(subasta);
            return;
        }

        // Find winner
        Oferta ganadora = ofertasValidas.stream()
                .max(comparadorGanador(subasta.getCondiciones()))
                .orElse(null);

        if (ganadora == null) {
            return;
        }

        // TRANSFER figurita to winner
        figuritaService.transferir(subasta.getFigurita().getId(), ganadora.getUsuario());

        // TRANSFER offered figuritas to seller
        ganadora.getFiguritas().forEach(fig ->
                figuritaService.transferir(fig.getId(), subasta.getUsuario())
        );

        // Update status
        subasta.setEstado(EstadoSubasta.FINALIZADA);
        repository.save(subasta);

        // NOTIFICATIONS
        // To winner
        notificacionService.crear(Notificacion.builder()
                .usuario(ganadora.getUsuario())
                .tipo("subasta")
                .titulo("¡Ganaste la subasta!")
                .mensaje("Ganaste la subasta de " + subasta.getFigurita().getFiguritaBase().getJugador().getNombre())
                .enlace("/subastas/" + subastaId)
                .leida(false)
                .fecha(LocalDateTime.now())
                .build());

        // To seller
        notificacionService.crear(Notificacion.builder()
                .usuario(subasta.getUsuario())
                .tipo("subasta")
                .titulo("Tu subasta finalizó")
                .mensaje(ganadora.getUsuario().getUsername() + " ganó tu subasta")
                .enlace("/subastas/" + subastaId)
                .leida(false)
                .fecha(LocalDateTime.now())
                .build());

        // POLISHED: Send exactly ONE notification per valid losing user
        ofertasValidas.stream()
                .filter(o -> !o.getId().equals(ganadora.getId()))
                .map(Oferta::getUsuario)
                .distinct()
                .forEach(usuarioPerdedor ->
                        notificacionService.crear(Notificacion.builder()
                                .usuario(usuarioPerdedor)
                                .tipo("subasta")
                                .titulo("No ganaste la subasta")
                                .mensaje("Tu oferta no fue seleccionada en la subasta")
                                .enlace("/subastas/" + subastaId)
                                .leida(false)
                                .fecha(LocalDateTime.now())
                                .build())
                );
    }

    public Optional<Subasta> actualizar(String id, Subasta subasta) {
        if (!repository.existsById(id)) {
            return Optional.empty();
        }
        subasta.setId(id);
        return Optional.of(repository.save(subasta));
    }

    public boolean eliminar(String id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    private List<Oferta> filtrarOfertasValidas(Subasta subasta) {
        List<CondicionImpl> condiciones = subasta.getCondiciones();

        if (subasta.getOfertas() == null) {
            return Collections.emptyList();
        }

        return subasta.getOfertas().stream()
                .filter(oferta ->
                        ownsAllOfferedStickers(oferta) &&
                                matchesAuctionConditions(oferta, condiciones)
                )
                .collect(Collectors.toList());
    }

    private boolean ownsAllOfferedStickers(Oferta oferta) {
        String idOfertante = oferta.getUsuario().getId();

        return oferta.getFiguritas().stream()
                .allMatch(fig -> fig.getOwner().getId().equals(idOfertante));
    }

    private boolean matchesAuctionConditions(Oferta oferta, List<CondicionImpl> condiciones) {
        // No conditions = valid
        if (condiciones == null || condiciones.isEmpty()) {
            return true;
        }

        // At least one sticker must satisfy all conditions
        return oferta.getFiguritas().stream()
                .anyMatch(fig ->
                        condiciones.stream()
                                .allMatch(cond -> matchesFiltros(fig, cond.getFiltros()))
                );
    }

    private Comparator<Oferta> comparadorGanador(List<CondicionImpl> condiciones) {
        return (o1, o2) -> {
            // 1. Primary: Most matching figurines wins
            int match1 = contarFiguritasQueCoinciden(o1, condiciones);
            int match2 = contarFiguritasQueCoinciden(o2, condiciones);

            if (match1 != match2) {
                return Integer.compare(match1, match2); // Corrected: Higher match count wins in .max()
            }

            // 2. Tiebreaker 1: Fewest extra "junk" figurines (Fewer is better for the seller!)
            int noMatch1 = o1.getFiguritas().size() - match1;
            int noMatch2 = o2.getFiguritas().size() - match2;

            if (noMatch1 != noMatch2) {
                return Integer.compare(noMatch2, noMatch1); // Reversed on purpose: Lower junk count wins
            }

            // 3. Tiebreaker 2: Earliest bid wins
            // Because earlier dates are "smaller" chronological values, we want the smaller date to win.
            // So we compare o2 to o1 to invert it for the .max() stream.
            return o2.getFechaOferta().compareTo(o1.getFechaOferta());
        };
    }

    private int contarFiguritasQueCoinciden(Oferta oferta, List<CondicionImpl> condiciones) {
        if (condiciones == null || condiciones.isEmpty()) {
            return oferta.getFiguritas().size();
        }

        return (int) oferta.getFiguritas().stream()
                .filter(fig -> condiciones.stream().allMatch(cond ->
                        matchesFiltros(fig, cond.getFiltros())
                ))
                .count();
    }

    private boolean matchesFiltros(Figurita fig, List<Filtro> filtros) {
        if (filtros == null || filtros.isEmpty()) {
            return true;
        }
        return filtros.stream().allMatch(filtro -> matchFiltro(fig, filtro));
    }

    private boolean matchFiltro(Figurita fig, Filtro filtro) {
        if (fig.getFiguritaBase() == null) {
            return false;
        }

        switch (filtro.getTipo().toLowerCase()) {
            case "seleccion":
                return fig.getFiguritaBase().getSeleccion() != null
                        && fig.getFiguritaBase().getSeleccion().getNombre().equals(filtro.getValor());

            case "equipo":
                return fig.getFiguritaBase().getEquipo() != null
                        && fig.getFiguritaBase().getEquipo().getNombre().equals(filtro.getValor());

            case "categoria":
                return fig.getFiguritaBase().getCategoria() != null
                        && fig.getFiguritaBase().getCategoria().getNombre().equals(filtro.getValor());

            case "jugador":
                return fig.getFiguritaBase().getJugador() != null
                        && fig.getFiguritaBase().getJugador().getNombre().equals(filtro.getValor());

            default:
                return false;
        }
    }


    // FIXED: Added null checks to prevent NPE when mapping
    // Validates that required nested objects exist before accessing them
    /**
     * Orchestrator Method: Calculates dynamic, transient presentation state
     * (active valid offers, current leading bid, and leader details).
     */
    public SubastaResponseDTO mapToDTO(Subasta s) {
        if (s == null) {
            throw new RuntimeException("Subasta cannot be null");
        }
        if (s.getFigurita() == null || s.getFigurita().getFiguritaBase() == null) {
            throw new RuntimeException("Subasta must have valid Figurita and FiguritaBase");
        }
        if (s.getUsuario() == null) {
            throw new RuntimeException("Subasta must have valid Usuario");
        }

        // 1. Calculate dynamic business data on the fly
        List<Oferta> ofertasValidas = filtrarOfertasValidas(s);
        Oferta ganadoraActual = null;

        if (ofertasValidas != null && !ofertasValidas.isEmpty()) {
            ganadoraActual = ofertasValidas.stream()
                    .max(comparadorGanador(s.getCondiciones()))
                    .orElse(null);
        }

        // 2. Extract processed presentation fields
        String liderId = (ganadoraActual != null && ganadoraActual.getUsuario() != null)
                ? ganadoraActual.getUsuario().getId()
                : null;

        String liderUsername = (ganadoraActual != null && ganadoraActual.getUsuario() != null)
                ? ganadoraActual.getUsuario().getUsername()
                : "Nadie";

        List<String> liderFiguritas = new ArrayList<>();
        if (ganadoraActual != null && ganadoraActual.getFiguritas() != null) {
            liderFiguritas = ganadoraActual.getFiguritas().stream()
                    .filter(fig -> fig.getFiguritaBase() != null && fig.getFiguritaBase().getJugador() != null)
                    .map(fig -> fig.getFiguritaBase().getJugador().getNombre() + " (#" + fig.getFiguritaBase().getNumero() + ")")
                    .toList();
        }

        int cantidadOfertasActivas = (ofertasValidas != null) ? ofertasValidas.size() : 0;

        // 3. Delegate to the pure mapper to assemble the DTO object
        return buildPureSubastaResponseDTO(s, cantidadOfertasActivas, liderId, liderUsername, liderFiguritas);
    }

    /**
     * Pure Mapper: A completely "dumb" data copier.
     * Zero logic, zero evaluations—just mapping variables straight to fields.
     */
    private SubastaResponseDTO buildPureSubastaResponseDTO(
            Subasta s,
            int cantidadOfertasActivas,
            String liderId,
            String liderUsername,
            List<String> liderFiguritas) {

        return new SubastaResponseDTO(
                s.getId(),
                s.getUsuario().getId(),
                s.getUsuario().getUsername(),
                s.getFigurita().getId(),
                s.getFigurita().getFiguritaBase().getNumero(),
                s.getFigurita().getFiguritaBase().getJugador().getNombre(),
                s.getFigurita().getFiguritaBase().getSeleccion().getNombre(),
                s.getFigurita().getFiguritaBase().getEquipo().getNombre(),
                s.getFigurita().getFiguritaBase().getCategoria().getNombre(),
                s.getEstado(),
                s.getDuracion(),
                s.getHoraInicio(),
                s.getHoraFin(),
                cantidadOfertasActivas,
                liderId,
                liderUsername,
                liderFiguritas
        );
    }

}