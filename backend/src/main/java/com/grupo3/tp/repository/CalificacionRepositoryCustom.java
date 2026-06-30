package com.grupo3.tp.repository;

import com.grupo3.tp.models.Calificacion;

import java.util.List;

public interface CalificacionRepositoryCustom {
    /** Calificaciones recibidas por un usuario (las que alimentan su reputación). */
    List<Calificacion> findByUsuarioCalificadoId(String usuarioId);
}
