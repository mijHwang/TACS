package com.grupo3.tp.repository;

import com.grupo3.tp.models.Intercambio;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class IntercambioRepositoryImpl implements IntercambioRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public IntercambioRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<Intercambio> findByUsuarioGeneradorId(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("usuarioGenerador").is(new ObjectId(usuarioId))),
                Intercambio.class
        );
    }

    @Override
    public List<Intercambio> findByUsuarioIntercambiadorId(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("usuarioIntercambiador").is(new ObjectId(usuarioId))),
                Intercambio.class
        );
    }

    @Override
    public List<Intercambio> findByUsuarioId(String usuarioId) {
        return mongoTemplate.find(
                Query.query(
                        new Criteria().orOperator(
                                Criteria.where("usuarioGenerador").is(new ObjectId(usuarioId)),
                                Criteria.where("usuarioIntercambiador").is(new ObjectId(usuarioId))
                        )
                ),
                Intercambio.class
        );
    }
}