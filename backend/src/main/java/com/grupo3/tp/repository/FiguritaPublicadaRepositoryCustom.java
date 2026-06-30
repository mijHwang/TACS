package com.grupo3.tp.repository;

import com.grupo3.tp.models.FiguritaPublicada;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface FiguritaPublicadaRepositoryCustom {
    /**
     * Publicaciones DISPONIBLES de otros usuarios (excluye al usuario que consulta),
     * paginadas. Reemplaza el viejo findDisponibles() que escaneaba toda la colección
     * y filtraba al caller en Java.
     */
    Page<FiguritaPublicada> findDisponibles(String usuarioId, Pageable pageable);
    List<FiguritaPublicada> findByUsuarioId(String usuarioId);
    List<FiguritaPublicada> findByFiguritaBaseId(String figuritaBaseId);
}