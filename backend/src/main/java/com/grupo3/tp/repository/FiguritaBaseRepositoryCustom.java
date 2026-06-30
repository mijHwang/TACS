package com.grupo3.tp.repository;

import com.grupo3.tp.dtos.CatalogoFiltro;
import com.grupo3.tp.dtos.FiguritaBaseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FiguritaBaseRepositoryCustom {

    /**
     * Faltantes del usuario paginadas: figuritas-base que el usuario NO tiene
     * ({@code filtro.usuarioId()} = dueño), con filtros server-side. Orden por número asc.
     */
    Page<FiguritaBaseDTO> findFaltantesPaged(CatalogoFiltro filtro, Pageable pageable);

    /**
     * Búsqueda paginada de figuritas-base por texto (nombre de jugador/selección o número).
     * Pensada para el typeahead de "regalar figurita" (admin). Orden por número asc.
     */
    Page<FiguritaBaseDTO> searchPaged(String search, Pageable pageable);
}
