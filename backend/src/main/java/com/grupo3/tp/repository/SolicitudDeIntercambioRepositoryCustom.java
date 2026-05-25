package com.grupo3.tp.repository;

import com.grupo3.tp.models.SolicitudDeIntercambio;

import java.util.List;

public interface SolicitudDeIntercambioRepositoryCustom {
    List<SolicitudDeIntercambio> findByFiguritaOwnerId(String usuarioId);
    List<SolicitudDeIntercambio> findByUsuarioId(String usuarioId);
}
