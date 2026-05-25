package com.grupo3.tp.repository;

import com.grupo3.tp.models.Notificacion;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface NotificacionRepositoryCustom {

    List<Notificacion> findByUsuarioId(String usuarioId);
}
