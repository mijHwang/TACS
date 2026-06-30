package com.grupo3.tp.repository;

import com.grupo3.tp.models.Notificacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificacionRepositoryCustom {

    List<Notificacion> findByUsuarioId(String usuarioId);

    Page<Notificacion> findByUsuarioId(String usuarioId, Pageable pageable);
}
