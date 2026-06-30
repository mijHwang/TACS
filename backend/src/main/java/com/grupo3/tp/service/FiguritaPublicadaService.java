package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaPublicadaRequestDTO;
import com.grupo3.tp.dtos.FiguritaPublicadaResponseDTO;
import com.grupo3.tp.models.EstadoPublicacion;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaPublicada;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.FiguritaPublicadaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class FiguritaPublicadaService {

    private final FiguritaPublicadaRepository repository;
    private final FiguritaService figuritaService;
    private final UsuarioService usuarioService;


    public FiguritaPublicadaService(
            FiguritaPublicadaRepository repository,
            FiguritaService figuritaService,
            UsuarioService usuarioService) {
        this.repository = repository;
        this.figuritaService = figuritaService;
        this.usuarioService = usuarioService;
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

        Usuario usuario = usuarioService.obtenerPorId(dto.getUsuarioId())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        FiguritaPublicada publicacion = FiguritaPublicada.builder()
                .figuritas(aPublicar)
                .usuario(usuario)
                .figuritaBaseId(dto.getFiguritaBaseId())
                .fechaPublicacion(LocalDateTime.now())
                .estado(EstadoPublicacion.DISPONIBLE)
                .build();

        return mapToDTO(repository.save(publicacion));
    }

    public List<FiguritaPublicadaResponseDTO> obtenerDisponibles(String usuarioId) {
        List<FiguritaPublicada> publicaciones = repository.findDisponibles();

        return publicaciones.stream()
                .map(this::mapToDTO)
                .toList();
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