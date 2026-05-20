package com.grupo3.tp.repository;

import com.grupo3.tp.models.SolicitudDeIntercambio;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.List;
import java.util.stream.Collectors;

public class SolicitudDeIntercambioRepositoryImpl implements SolicitudDeIntercambioRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public SolicitudDeIntercambioRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<SolicitudDeIntercambio> findByFiguritaOwnerId(String usuarioId) {
        return mongoTemplate.findAll(SolicitudDeIntercambio.class).stream()
                .filter(s -> s.getFigurita() != null
                          && s.getFigurita().getOwner() != null
                          && usuarioId.equals(s.getFigurita().getOwner().getId()))
                .collect(Collectors.toList());
    }
}
