package com.grupo3.tp.repository;

import com.grupo3.tp.models.EstadoSubasta;
import com.grupo3.tp.models.Subasta;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.LocalDateTime;
import java.util.List;

public class SubastaRepositoryImpl implements SubastaRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public SubastaRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<Subasta> findByUsuarioId(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("usuario").is(new ObjectId(usuarioId))),
                Subasta.class
        );
    }

    @Override
    public List<Subasta> findByParticipating(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("ofertas.usuario").is(new ObjectId(usuarioId))),
                Subasta.class
        );
    }

    @Override
    public List<Subasta> findByEstadoAndHoraFinBefore(EstadoSubasta estado, LocalDateTime ahora) {
        return mongoTemplate.find(
                Query.query(Criteria.where("estado").is(estado)
                        .and("horaFin").lt(ahora)),
                Subasta.class
        );
    }


}