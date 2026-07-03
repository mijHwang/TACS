package com.grupo3.tp.repository;

import com.grupo3.tp.models.SolicitudDeIntercambio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SolicitudDeIntercambioRepositoryCustom {
    List<SolicitudDeIntercambio> findByFiguritaOwnerId(String usuarioId);
    List<SolicitudDeIntercambio> findByUsuarioId(String usuarioId);

    Page<SolicitudDeIntercambio> findByFiguritaOwnerId(String usuarioId, Pageable pageable);
    Page<SolicitudDeIntercambio> findByUsuarioId(String usuarioId, Pageable pageable);

    List<SolicitudDeIntercambio> findByFiguritaIds(List<String> figuritaIds);

    /** Solicitudes PENDIENTES que referencian la figurita (como pedida o como ofrecida). Para la cascada. */
    List<SolicitudDeIntercambio> findPendientesByFiguritaId(String figuritaId);
}
