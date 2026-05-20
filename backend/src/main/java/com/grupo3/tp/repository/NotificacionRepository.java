package com.grupo3.tp.repository;

import com.grupo3.tp.models.Notificacion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionRepository extends MongoRepository<Notificacion, String> {
    @Query("{ 'usuario': ?0 }")
    List<Notificacion> findByUsuarioId(String usuarioId);
}
