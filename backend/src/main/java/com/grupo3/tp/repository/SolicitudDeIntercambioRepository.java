package com.grupo3.tp.repository;

import com.grupo3.tp.models.SolicitudDeIntercambio;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudDeIntercambioRepository
        extends MongoRepository<SolicitudDeIntercambio, String>, SolicitudDeIntercambioRepositoryCustom {

    @Query("{ 'usuario': ?0 }")
    List<SolicitudDeIntercambio> findByUsuarioId(String usuarioId);
}
