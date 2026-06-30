package com.grupo3.tp.repository;

import com.grupo3.tp.dtos.CatalogoFiltro;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.Figurita;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;


public interface FiguritaRepositoryCustom {

    List<Figurita>findByFiguritaOwnerId(String usuarioId);
    List<FiguritaResponseDTO> findRepetidas(String usuarioId);

    /**
     * Catálogo paginado: una entrada por figurita-base (agrupada), excluyendo las del caller
     * ({@code filtro.usuarioId()}), con filtros server-side. Orden por número asc.
     */
    Page<FiguritaResponseDTO> findCatalogoPaged(CatalogoFiltro filtro, Pageable pageable);

    /**
     * Colección del usuario paginada: agrupada por base con cantidad, del dueño
     * ({@code filtro.usuarioId()}), con filtros server-side. Orden por número asc.
     */
    Page<FiguritaResponseDTO> findByOwnerPaged(CatalogoFiltro filtro, Pageable pageable);

    /**
     * Repetidas del usuario paginadas: igual que la colección pero sólo grupos con cantidad &gt; 1.
     */
    Page<FiguritaResponseDTO> findRepetidasPaged(CatalogoFiltro filtro, Pageable pageable);
}
