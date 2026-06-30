package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.SugerenciaResponseDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.Sugerencia;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.FiguritaRepository;
import com.grupo3.tp.repository.SugerenciaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Calcula y persiste las sugerencias de intercambio bidireccional (US4).
 */
@Service
public class SugerenciaService {

    private final SugerenciaRepository sugerenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final FiguritaRepository figuritaRepository;

    public SugerenciaService(SugerenciaRepository sugerenciaRepository,
                             UsuarioRepository usuarioRepository,
                             FiguritaRepository figuritaRepository) {
        this.sugerenciaRepository = sugerenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.figuritaRepository = figuritaRepository;
    }

    /** Sugerencias persistidas del usuario, mapeadas a DTO. */
    public List<SugerenciaResponseDTO> obtenerPorUsuario(String usuarioId) {
        return sugerenciaRepository.findByUsuarioId(usuarioId).stream()
                .map(this::toResponseDTO)
                .toList();
    }

    /** Sugerencias persistidas del usuario, paginadas y mapeadas a DTO. */
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
     * Recalcula y reemplaza las sugerencias de todos los usuarios. Para cada par (U, V) con U != V,
     * crea una sugerencia si V tiene repetidas que a U le faltan Y U tiene repetidas que a V le faltan
     * (intercambio bidireccional viable). El reemplazo es por usuario para evitar ventanas vacías.
     */
    public void regenerarTodas() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        List<Figurita> todas = figuritaRepository.findAll();

        Map<String, List<Figurita>> porOwner = todas.stream()
                .filter(f -> f.getOwner() != null && f.getFiguritaBase() != null)
                .collect(Collectors.groupingBy(f -> f.getOwner().getId()));

        // owner id -> bases que posee
        Map<String, Set<String>> basesPoseidas = new HashMap<>();
        // owner id -> (baseId -> instancia representativa como DTO) de las repetidas (count > 1)
        Map<String, Map<String, FiguritaResponseDTO>> repetidas = new HashMap<>();

        for (Map.Entry<String, List<Figurita>> e : porOwner.entrySet()) {
            Map<String, List<Figurita>> porBase = e.getValue().stream()
                    .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()));
            basesPoseidas.put(e.getKey(), new HashSet<>(porBase.keySet()));
            Map<String, FiguritaResponseDTO> rep = new HashMap<>();
            for (Map.Entry<String, List<Figurita>> be : porBase.entrySet()) {
                if (be.getValue().size() > 1) {
                    rep.put(be.getKey(), toDTO(be.getValue().get(0)));
                }
            }
            repetidas.put(e.getKey(), rep);
        }

        LocalDateTime ahora = LocalDateTime.now();

        for (Usuario u : usuarios) {
            Set<String> ownedU = basesPoseidas.getOrDefault(u.getId(), Set.of());
            Map<String, FiguritaResponseDTO> repU = repetidas.getOrDefault(u.getId(), Map.of());

            List<Sugerencia> candidatos = new ArrayList<>();
            for (Usuario v : usuarios) {
                if (v.getId().equals(u.getId())) {
                    continue;
                }
                Set<String> ownedV = basesPoseidas.getOrDefault(v.getId(), Set.of());
                Map<String, FiguritaResponseDTO> repV = repetidas.getOrDefault(v.getId(), Map.of());

                List<FiguritaResponseDTO> aRecibir = repV.entrySet().stream()
                        .filter(en -> !ownedU.contains(en.getKey()))
                        .map(Map.Entry::getValue).toList();
                List<FiguritaResponseDTO> aOfrecer = repU.entrySet().stream()
                        .filter(en -> !ownedV.contains(en.getKey()))
                        .map(Map.Entry::getValue).toList();

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
            sugerenciaRepository.deleteByUsuarioId(u.getId());
            if (!candidatos.isEmpty()) {
                sugerenciaRepository.saveAll(candidatos);
            }
        }
    }

    private FiguritaResponseDTO toDTO(Figurita f) {
        return new FiguritaResponseDTO(
                f.getId(),
                f.getFiguritaBase().getNumero(),
                f.getFiguritaBase().getId(),
                1,
                f.getFiguritaBase().getJugador().getNombre(),
                f.getFiguritaBase().getSeleccion().getNombre(),
                f.getFiguritaBase().getEquipo().getNombre(),
                f.getFiguritaBase().getCategoria().getNombre(),
                f.getOwner().getId(),
                f.getOwner().getUsername()
        );
    }
}
