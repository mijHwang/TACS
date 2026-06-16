package com.grupo3.tp.service;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SubastaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Service
public class SubastaService {

    private final SubastaRepository repository;
    private final FiguritaService figuritaService;
    private final NotificacionService notificacionService;



    public SubastaService(SubastaRepository repository,
                          FiguritaService figuritaService,
                          NotificacionService notificacionService) {
        this.repository = repository;
        this.figuritaService = figuritaService;
        this.notificacionService = notificacionService;
    }

    public Subasta crear(Subasta subasta) {

        subasta.setEstado(EstadoSubasta.PENDIENTE);

        if (subasta.getHoraInicio() == null) {
            subasta.setHoraInicio(LocalDateTime.now());
        }
        if (subasta.getDuracion() != null) {
            subasta.setHoraFin(subasta.getHoraInicio().plusMinutes(subasta.getDuracion()));
        }

        return repository.save(subasta);

    }

    @ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
    @Scheduled(fixedDelay = 60000)  // Run every 60 seconds
    public void finalizarSubastasExpiradas() {
        LocalDateTime ahora = LocalDateTime.now();

        List<Subasta> subastas = repository.findAll();

        subastas.stream()
                .filter(s -> s.getEstado() == EstadoSubasta.EN_CURSO)
                .filter(s -> s.getHoraFin() != null && s.getHoraFin().isBefore(ahora))
                .forEach(s -> {
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


    public void finalizar(String subastaId) {
        Subasta subasta = repository.findById(subastaId)
                .orElseThrow(() -> new RuntimeException("Subasta not found"));

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

        // To losers
        subasta.getOfertas().stream()
                .filter(o -> !o.getId().equals(ganadora.getId()))
                .forEach(oferta ->
                        notificacionService.crear(Notificacion.builder()
                                .usuario(oferta.getUsuario())
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

        return subasta.getOfertas().stream()
                .filter(oferta -> {
                    // No conditions = valid
                    if (condiciones == null || condiciones.isEmpty()) {
                        return true;
                    }
                    // At least one figurita must match all conditions
                    return oferta.getFiguritas().stream().anyMatch(fig ->
                            condiciones.stream().allMatch(cond -> matchesFiltros(fig, cond.getFiltros()))
                    );
                })
                .collect(Collectors.toList());
    }

    private Comparator<Oferta> comparadorGanador(List<CondicionImpl> condiciones) {
        return (o1, o2) -> {
            // Primary: most figuritas matching ALL conditions
            int match1 = contarFiguritasQueCoinciden(o1, condiciones);
            int match2 = contarFiguritasQueCoinciden(o2, condiciones);

            if (match1 != match2) {
                return match2 - match1;  // Higher is better
            }

            // Tiebreaker 1: most non-matching figuritas
            int noMatch1 = o1.getFiguritas().size() - match1;
            int noMatch2 = o2.getFiguritas().size() - match2;

            if (noMatch1 != noMatch2) {
                return noMatch2 - noMatch1;  // Higher is better
            }

            // Tiebreaker 2: earliest bid wins
            return o1.getFechaOferta().compareTo(o2.getFechaOferta());
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


}
