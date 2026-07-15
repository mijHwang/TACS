package com.grupo3.tp.service;

import com.grupo3.tp.dtos.CatalogoFiltro;
import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.EstadoFigurita;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.FiguritaBaseRepository;
import com.grupo3.tp.repository.FiguritaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.dao.OptimisticLockingFailureException;
import java.util.ConcurrentModificationException;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class FiguritaService {

    private final FiguritaRepository repository;
    private final FiguritaBaseRepository figuritaBaseRepository;

    public FiguritaService(FiguritaRepository repository,  FiguritaBaseRepository figuritaRepository) {
        this.repository = repository;
        this.figuritaBaseRepository = figuritaRepository;
    }

    public Figurita crear(Figurita figurita) {
        return repository.save(figurita);
    }

    public Optional<Figurita> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public List<FiguritaResponseDTO> obtenerPorUserId(String userId) {
        List<Figurita> all = repository.findByFiguritaOwnerId(userId);

        return all.stream()
                .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()))
                .values().stream()
                .map(group -> new FiguritaResponseDTO(
                        group.get(0).getId(),
                        group.get(0).getFiguritaBase().getNumero(),
                        group.get(0).getFiguritaBase().getId(),
                        group.size(),  // count
                        group.get(0).getFiguritaBase().getJugador().getNombre(),
                        group.get(0).getFiguritaBase().getSeleccion().getNombre(),
                        group.get(0).getFiguritaBase().getEquipo().getNombre(),
                        group.get(0).getFiguritaBase().getCategoria().getNombre(),
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername(),
                        group.get(0).getFiguritaBase().getImagenUrl()
                ))
                .toList();
    }

    public List<FiguritaBaseDTO> obtenerFaltantes(String userId) {
        List<FiguritaBase> todasBases = figuritaBaseRepository.findAll();

        List<Figurita> misFiguritas = repository.findByFiguritaOwnerId(userId);
        Set<String> misFiguritasBaseIds = misFiguritas.stream()
                .map(f -> f.getFiguritaBase().getId())
                .collect(Collectors.toSet());

        return todasBases.stream()
                .filter(base -> !misFiguritasBaseIds.contains(base.getId()))
                .map(base -> new FiguritaBaseDTO(
                        base.getId(),
                        base.getNumero(),
                        base.getJugador().getNombre(),
                        base.getSeleccion().getNombre(),
                        base.getEquipo().getNombre(),
                        base.getCategoria().getNombre(),
                        base.getImagenUrl()
                ))
                .toList();
    }

    public List<FiguritaResponseDTO> obtenerTodas() {
        List<Figurita> all = repository.findAll();

        return all.stream()
                .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()))
                .values().stream()
                .map(group -> new FiguritaResponseDTO(
                        group.get(0).getId(),
                        group.get(0).getFiguritaBase().getNumero(),
                        group.get(0).getFiguritaBase().getId(),  // figuritaBaseId
                        group.size(),  // count
                        group.get(0).getFiguritaBase().getJugador().getNombre(),
                        group.get(0).getFiguritaBase().getSeleccion().getNombre(),
                        group.get(0).getFiguritaBase().getEquipo().getNombre(),
                        group.get(0).getFiguritaBase().getCategoria().getNombre(),
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername(),
                        group.get(0).getFiguritaBase().getImagenUrl()
                ))
                .toList();

    }

    public List<FiguritaResponseDTO> obtenerTodasSinAgrupar() {
        return repository.findAll().stream()
                .map(figurita -> new FiguritaResponseDTO(
                        figurita.getId(),
                        figurita.getFiguritaBase().getNumero(),
                        figurita.getFiguritaBase().getId(),
                        1,  // count = 1
                        figurita.getFiguritaBase().getJugador().getNombre(),
                        figurita.getFiguritaBase().getSeleccion().getNombre(),
                        figurita.getFiguritaBase().getEquipo().getNombre(),
                        figurita.getFiguritaBase().getCategoria().getNombre(),
                        figurita.getOwner().getId(),
                        figurita.getOwner().getUsername(),
                        figurita.getFiguritaBase().getImagenUrl()
                ))
                .toList();
    }

    public List<Figurita> obtenerTodasInternaPorUserId(String userId){

        List<Figurita> all = repository.findByFiguritaOwnerId(userId);
        return all;
    }

    public Optional<Figurita> actualizar(String id, Figurita figurita) {
        if (!repository.existsById(id)) {
            return Optional.empty();
        }
        figurita.setId(id);
        return Optional.of(repository.save(figurita));
    }



    public boolean eliminar(String id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    public Optional<Figurita> transferir(String figuritaId, Usuario newOwner) {

        if (!repository.existsById(figuritaId)){
            return Optional.empty();
        }

        Figurita figurita = repository.findById(figuritaId).orElseThrow();
      
        figurita.setOwner(newOwner);
        figurita.setEstado(EstadoFigurita.LIBRE);

        Figurita updated = repository.save(figurita);
        return Optional.of(updated);


    }


    public void reclamar(String figuritaId, EstadoFigurita nuevoEstado) {
        Figurita fig = repository.findById(figuritaId)
                .orElseThrow(() -> new RuntimeException("Figurita no encontrada: " + figuritaId));

        if (fig.getEstado() != null && fig.getEstado() != EstadoFigurita.LIBRE) {
            throw new IllegalStateException("La figurita ya está en uso (" + fig.getEstado() + ").");
        }

        fig.setEstado(nuevoEstado);

        try {
            repository.save(fig);
        } catch (OptimisticLockingFailureException e) {
            throw new ConcurrentModificationException(
                    "La figurita cambió de estado justo ahora, intentá de nuevo.");
        }
    }

    /**
     * Libera una figurita, devolviéndola a estado LIBRE. Se llama cuando una operación
     * que la tenía reservada termina, se cancela o se rechaza.
     *
     * @param figuritaId id de la figurita a liberar
     */
    public void liberar(String figuritaId) {
        repository.findById(figuritaId).ifPresent(fig -> {
            fig.setEstado(EstadoFigurita.LIBRE);
            repository.save(fig);
        });
    }

    public List<FiguritaResponseDTO> obtenerRepetidas(String usuarioId) {
        return repository.findRepetidas(usuarioId);
    }

    // ── Variantes paginadas (aggregation server-side) ─────────────────────────

    /** Catálogo paginado y filtrado. {@code filtro.usuarioId()} = caller a excluir (nullable). */
    public Page<FiguritaResponseDTO> obtenerCatalogoPaginado(CatalogoFiltro filtro, Pageable pageable) {
        return repository.findCatalogoPaged(filtro, pageable);
    }

    /** Colección del usuario, paginada y filtrada. {@code filtro.usuarioId()} = dueño. */
    public Page<FiguritaResponseDTO> obtenerPorUserIdPaginado(CatalogoFiltro filtro, Pageable pageable) {
        return repository.findByOwnerPaged(filtro, pageable);
    }

    /** Repetidas del usuario, paginadas y filtradas. {@code filtro.usuarioId()} = dueño. */
    public Page<FiguritaResponseDTO> obtenerRepetidasPaginado(CatalogoFiltro filtro, Pageable pageable) {
        return repository.findRepetidasPaged(filtro, pageable);
    }

    /** Faltantes del usuario, paginadas y filtradas. {@code filtro.usuarioId()} = dueño. */
    public Page<FiguritaBaseDTO> obtenerFaltantesPaginado(CatalogoFiltro filtro, Pageable pageable) {
        return figuritaBaseRepository.findFaltantesPaged(filtro, pageable);
    }

    /** Búsqueda paginada de figuritas-base por texto (typeahead admin). */
    public Page<FiguritaBaseDTO> buscarBasesPaginado(String search, Pageable pageable) {
        return figuritaBaseRepository.searchPaged(search, pageable);
    }

    /**
     * Maestro paginado para el modal de "agregar figurita".
     * Sin {@code excludeOwnedBy}: maestro completo (todas las bases). Con {@code excludeOwnedBy}:
     * maestro MENOS las bases que ese usuario ya posee (reusa {@code findFaltantesPaged}).
     * En ambos casos la búsqueda matchea jugador/selección/número.
     */
    public Page<FiguritaBaseDTO> buscarMaestroPaginado(String search, String excludeOwnedBy, Pageable pageable) {
        if (excludeOwnedBy == null || excludeOwnedBy.isBlank()) {
            return figuritaBaseRepository.searchPaged(search, pageable);
        }
        CatalogoFiltro filtro = new CatalogoFiltro(excludeOwnedBy, null, null, search, null, null, null);
        return figuritaBaseRepository.findFaltantesPaged(filtro, pageable);
    }
}
