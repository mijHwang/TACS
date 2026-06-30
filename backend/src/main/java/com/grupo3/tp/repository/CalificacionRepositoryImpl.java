package com.grupo3.tp.repository;

import com.grupo3.tp.models.Calificacion;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CalificacionRepositoryImpl implements CalificacionRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public CalificacionRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<Calificacion> findByUsuarioCalificadoId(String usuarioId) {
        // usuarioCalificado es un @DocumentReference: se almacena como ObjectId del Usuario.
        return mongoTemplate.find(
                Query.query(Criteria.where("usuarioCalificado").is(new ObjectId(usuarioId))),
                Calificacion.class
        );
    }
}
