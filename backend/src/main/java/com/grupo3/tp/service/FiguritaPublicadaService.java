package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaPublicadaRequestDTO;
import com.grupo3.tp.dtos.FiguritaPublicadaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FiguritaPublicadaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FiguritaPublicadaService {

    private final FiguritaPublicadaRepository repository;
    private final FiguritaService figuritaService;
    private final UsuarioService usuarioService;
    private final NotificacionService notificacionService;
    private final UsuarioRepository usuarioRepository;


    public FiguritaPublicadaService(
            FiguritaPublicadaRepository repository,
            FiguritaService figuritaService,
            UsuarioService usuarioService,
            NotificacionService notificacionService,
            UsuarioRepository usuarioRepository) {
        this.repository = repository;
        this.figuritaService = figuritaService;
        this.usuarioService = usuarioService;
        this.notificacionService = notificacionService;
        this.usuarioRepository = usuarioRepository;
    }

    public FiguritaPublicadaResponseDTO publicar(FiguritaPublicadaRequestDTO dto) {
        // 1. Get all figuritas of this base owned by user
        List<Figurita> todasDelUsuario = figuritaService
                .obtenerTodasInternaPorUserId(dto.getUsuarioId())
                .stream()
                .filter(f -> f.getFiguritaBase().getId().equals(dto.getFiguritaBaseId()))
                .toList();

        // 2. Get already published figurita IDs for this user
        Set<String> yaPublicadas = repository.findByUsuarioId(dto.getUsuarioId())
                .stream()
                .filter(p -> p.getEstado() == EstadoPublicacion.DISPONIBLE)
                .flatMap(p -> p.getFiguritas().stream())
                .map(Figurita::getId)
                .collect(Collectors.toSet());

        // 3. Pick only unoccupied ones
        List<Figurita> disponibles = todasDelUsuario.stream()
                .filter(f -> !yaPublicadas.contains(f.getId()))
                .toList();

        if (disponibles.size() < dto.getCantidad()) {
            throw new IllegalArgumentException(
                    "Solo tenés " + disponibles.size() + " figuritas disponibles para publicar"
            );
        }

        // 4. Take only the requested amount
        List<Figurita> aPublicar = disponibles.subList(0, dto.getCantidad());

        // 5. Reclamar cada figurita ANTES de crear la publicación. Si alguna ya está
        // comprometida en otra operación (subasta, oferta), se aborta y se libera lo reclamado.
        List<String> reclamadas = new ArrayList<>();
        try {
            for (Figurita f : aPublicar) {
                figuritaService.reclamar(f.getId(), EstadoFigurita.PUBLICADA);
                reclamadas.add(f.getId());
            }
        } catch (IllegalStateException | ConcurrentModificationException e) {
            reclamadas.forEach(figuritaService::liberar);
            throw new IllegalStateException(
                    "Una o más figuritas ya están comprometidas en otra operación: " + e.getMessage());
        }

        Usuario usuario = usuarioService.obtenerPorId(dto.getUsuarioId())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));


        FiguritaPublicada publicacion = FiguritaPublicada.builder()
                .figuritas(aPublicar)
                .usuario(usuario)
                .figuritaBaseId(dto.getFiguritaBaseId())
                .fechaPublicacion(LocalDateTime.now())
                .estado(EstadoPublicacion.DISPONIBLE)
                .build();

        FiguritaPublicada saved;
        try {
            saved = repository.save(publicacion);
        } catch (Exception e) {
            reclamadas.forEach(figuritaService::liberar);
            throw e;
        }

        // Notificar (en background) a los usuarios a los que les falta esta figurita.
        // Aislado en try/catch para que un fallo notificando no rompa la publicación.
        try {
            Figurita primera = aPublicar.get(0);
            List<Usuario> interesados = usuarioRepository.findUsuariosQueLesFaltaFigurita(dto.getFiguritaBaseId());

            notificacionService.notificarUsuariosFaltantes(
                    interesados,
                    primera.getFiguritaBase().getJugador().getNombre(),
                    dto.getUsuarioId()
            );
        } catch (Exception e) {
            System.err.println("Error generando notificaciones de publicación de faltantes: " + e.getMessage());
        }

        return mapToDTO(saved);
    }

    public Page<FiguritaPublicadaResponseDTO> obtenerDisponibles(String usuarioId, Pageable pageable) {
        // La exclusión del usuario que consulta y el filtro por estado DISPONIBLE
        // ahora se resuelven en la query (ver FiguritaPublicadaRepositoryImpl).
        return repository.findDisponibles(usuarioId, pageable).map(this::mapToDTO);
    }


    public List<FiguritaPublicadaResponseDTO> obtenerPorUsuario(String usuarioId) {
        return repository.findByUsuarioId(usuarioId).stream()
                .map(this::mapToDTO)
                .toList();
    }

    public Optional<FiguritaPublicada> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public FiguritaPublicadaResponseDTO retirar(String id) {
        FiguritaPublicada publicacion = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Publicacion no encontrada"));
        publicacion.setEstado(EstadoPublicacion.RETIRADA);

        publicacion.getFiguritas().forEach(f -> figuritaService.liberar(f.getId()));

        
        return mapToDTO(repository.save(publicacion));
    }

    public FiguritaPublicadaResponseDTO mapToDTO(FiguritaPublicada p) {
        List<String> figuritaIds = p.getFiguritas().stream()
                .map(Figurita::getId)
                .toList();

        Figurita primera = p.getFiguritas().get(0);

        return new FiguritaPublicadaResponseDTO(
                p.getId(),
                p.getFiguritaBaseId(),
                primera.getFiguritaBase().getNumero(),
                primera.getFiguritaBase().getJugador().getNombre(),
                primera.getFiguritaBase().getSeleccion().getNombre(),
                primera.getFiguritaBase().getEquipo().getNombre(),
                primera.getFiguritaBase().getCategoria().getNombre(),
                figuritaIds,
                figuritaIds.size(),
                p.getUsuario().getId(),
                p.getUsuario().getUsername(),
                p.getFechaPublicacion(),
                p.getEstado().name()
        );
    }

    public void removeFiguritaFromPublications(String figuritaId) {
        List<FiguritaPublicada> publications = repository.findByFiguritaId(figuritaId);
        for (FiguritaPublicada pub : publications) {
            boolean removed = pub.getFiguritas().removeIf(f -> f.getId().equals(figuritaId));
            if (removed) {
                if (pub.getFiguritas().isEmpty()) {
                    pub.setEstado(EstadoPublicacion.RETIRADA);
                }
                repository.save(pub);
            }
        }
    }
}