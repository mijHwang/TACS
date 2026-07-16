package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.SugerenciaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Calcula y persiste las sugerencias de intercambio bidireccional (US4).
 * Ahora basado en Publicaciones Activas en lugar de inventario plano.
 */
@Service
public class SugerenciaService {

    private final SugerenciaRepository sugerenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final FaltanteRepository faltanteRepository;
    private final FiguritaPublicadaRepository figuritaPublicadaRepository;
    private final FiguritaRepository figuritaRepository; // Reintroducido para el chequeo defensivo de propiedad

    public SugerenciaService(SugerenciaRepository sugerenciaRepository,
                             UsuarioRepository usuarioRepository,
                             FaltanteRepository faltanteRepository,
                             FiguritaPublicadaRepository figuritaPublicadaRepository,
                             FiguritaRepository figuritaRepository) {
        this.sugerenciaRepository = sugerenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.faltanteRepository = faltanteRepository;
        this.figuritaPublicadaRepository = figuritaPublicadaRepository;
        this.figuritaRepository = figuritaRepository;
    }

    public List<SugerenciaResponseDTO> obtenerPorUsuario(String usuarioId) {
        return sugerenciaRepository.findByUsuarioId(usuarioId).stream()
                .map(this::toResponseDTO)
                .toList();
    }

    public Page<SugerenciaResponseDTO> obtenerPorUsuario(String usuarioId, Pageable pageable) {
        return sugerenciaRepository.findByUsuarioId(usuarioId, pageable)
                .map(this::toResponseDTO);
    }

    private SugerenciaResponseDTO toResponseDTO(Sugerencia s) {
        return new SugerenciaResponseDTO(
                s.getContraparteId(), s.getContraparteNombre(),
                s.getFiguritasARecibir(), s.getFiguritasAOfrecer());
    }

    /**
     * Recalcula y reemplaza las sugerencias de todos los usuarios basándose en:
     * 1. Publicaciones ACTIVAS y DISPONIBLES de los usuarios (Oferta).
     * 2. Sus wishlists (Faltantes).
     * 3. Chequeo defensivo contra su colección actual de figuritas (para no sugerir lo que ya tienen).
     */
    public void regenerarTodas() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        List<Figurita> todasLasFiguritas = figuritaRepository.findAll();
        List<Faltante> todosLosFaltantes = faltanteRepository.findAll();
        List<FiguritaPublicada> todasLasPublicadas = figuritaPublicadaRepository.findAll();

        // 1. Mapear qué bases posee ya cada usuario (Para el chequeo defensivo de propiedad)
        // usuarioId -> Set de figuritaBaseId que el usuario ya tiene en su poder
        Map<String, Set<String>> basesPoseidas = new HashMap<>();
        for (Figurita f : todasLasFiguritas) {
            if (f.getOwner() != null && f.getFiguritaBase() != null) {
                basesPoseidas.computeIfAbsent(f.getOwner().getId(), k -> new HashSet<>())
                        .add(f.getFiguritaBase().getId());
            }
        }

        // 2. Mapear las wishlists (usuarioId -> Set de figuritaBaseId deseadas)
        Map<String, Set<String>> wishlist = new HashMap<>();
        for (Faltante f : todosLosFaltantes) {
            if (f.getUsuarioId() != null && f.getFiguritaBaseId() != null) {
                wishlist.computeIfAbsent(f.getUsuarioId(), k -> new HashSet<>()).add(f.getFiguritaBaseId());
            }
        }

        // 3. Filtrar y agrupar publicaciones válidas por Ofertante (usuarioId -> List de Publicaciones)
        // GUARD: Filtramos publicaciones nulas, sin dueño, inactivas, o que NO tengan figuritas asociadas
        List<FiguritaPublicada> publicadasValidas = todasLasPublicadas.stream()
                .filter(p -> p.getEstado() == EstadoPublicacion.DISPONIBLE
                        && p.getUsuario() != null
                        && p.getFiguritas() != null
                        && !p.getFiguritas().isEmpty())
                .toList();

        Map<String, List<FiguritaPublicada>> publicacionesPorUsuario = publicadasValidas.stream()
                .collect(Collectors.groupingBy(p -> p.getUsuario().getId()));

        LocalDateTime ahora = LocalDateTime.now();

        for (Usuario u : usuarios) {
            Set<String> wishU = wishlist.getOrDefault(u.getId(), Set.of());
            Set<String> ownedU = basesPoseidas.getOrDefault(u.getId(), Set.of());

            // Agrupamos la oferta de U por baseId para poder fusionar en caso de duplicados
            List<FiguritaPublicada> pubU = publicacionesPorUsuario.getOrDefault(u.getId(), List.of());
            Map<String, List<FiguritaPublicada>> pubUByBase = pubU.stream()
                    .collect(Collectors.groupingBy(FiguritaPublicada::getFiguritaBaseId));

            List<Sugerencia> candidatos = new ArrayList<>();

            for (Usuario v : usuarios) {
                if (v.getId().equals(u.getId())) {
                    continue; // No nos sugerimos a nosotros mismos
                }

                Set<String> wishV = wishlist.getOrDefault(v.getId(), Set.of());
                Set<String> ownedV = basesPoseidas.getOrDefault(v.getId(), Set.of());

                // Agrupamos la oferta de V por baseId
                List<FiguritaPublicada> pubV = publicacionesPorUsuario.getOrDefault(v.getId(), List.of());
                Map<String, List<FiguritaPublicada>> pubVByBase = pubV.stream()
                        .collect(Collectors.groupingBy(FiguritaPublicada::getFiguritaBaseId));

                // -- U RECIBE lo que V ofrece --
                // Filtramos las bases de V que:
                // 1. Están en la wishlist de U
                // 2. NO las tiene físicamente U (Defensa)
                List<FiguritaResponseDTO> aRecibir = new ArrayList<>();
                for (Map.Entry<String, List<FiguritaPublicada>> entry : pubVByBase.entrySet()) {
                    String baseId = entry.getKey();
                    if (wishU.contains(baseId) && !ownedU.contains(baseId)) {
                        aRecibir.add(mergeAndMapToDTO(entry.getValue(), baseId, v));
                    }
                }

                // -- U OFRECE lo que U tiene publicado --
                // Filtramos las bases de U que:
                // 1. Están en la wishlist de V
                // 2. NO las tiene físicamente V (Defensa)
                List<FiguritaResponseDTO> aOfrecer = new ArrayList<>();
                for (Map.Entry<String, List<FiguritaPublicada>> entry : pubUByBase.entrySet()) {
                    String baseId = entry.getKey();
                    if (wishV.contains(baseId) && !ownedV.contains(baseId)) {
                        aOfrecer.add(mergeAndMapToDTO(entry.getValue(), baseId, u));
                    }
                }

                // Generar la sugerencia únicamente si es un WIN-WIN bidireccional viable
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

            // Guardamos las sugerencias de manera transaccional por usuario
            sugerenciaRepository.deleteByUsuarioId(u.getId());
            if (!candidatos.isEmpty()) {
                sugerenciaRepository.saveAll(candidatos);
            }
        }
    }

    /**
     * Fusiona múltiples publicaciones del mismo sticker base de un usuario
     * en un único DTO legible, sumando sus existencias de forma segura.
     */
    private FiguritaResponseDTO mergeAndMapToDTO(List<FiguritaPublicada> publicaciones, String baseId, Usuario owner) {
        // Obtenemos la primera publicación para extraer los datos de la metadata base
        // (Ya validamos previamente que la lista no esté vacía y tenga al menos una figurita física)
        FiguritaPublicada primeraPublicada = publicaciones.get(0);
        Figurita primeraFigurita = primeraPublicada.getFiguritas().get(0);

        // Sumamos las cantidades de todas las publicaciones agrupadas del mismo sticker
        int cantidadTotal = publicaciones.stream()
                .mapToInt(p -> p.getFiguritas().size())
                .sum();

        return new FiguritaResponseDTO(
                primeraFigurita.getId(),
                primeraFigurita.getFiguritaBase().getNumero(),
                baseId,
                cantidadTotal, // Suma total acumulada
                primeraFigurita.getFiguritaBase().getJugador().getNombre(),
                primeraFigurita.getFiguritaBase().getSeleccion().getNombre(),
                primeraFigurita.getFiguritaBase().getEquipo().getNombre(),
                primeraFigurita.getFiguritaBase().getCategoria().getNombre(),
                owner.getId(),
                owner.getUsername(),
                primeraFigurita.getFiguritaBase().getImagenUrl()
        );
    }
}