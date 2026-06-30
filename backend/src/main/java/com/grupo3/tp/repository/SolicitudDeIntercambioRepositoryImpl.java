package com.grupo3.tp.repository;

import com.grupo3.tp.models.SolicitudDeIntercambio;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;
import java.util.stream.Collectors;

public class SolicitudDeIntercambioRepositoryImpl implements SolicitudDeIntercambioRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public SolicitudDeIntercambioRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<SolicitudDeIntercambio> findByFiguritaOwnerId(String usuarioId) {
        Query query = Query.query(
                Criteria.where("figurita.owner").is(new ObjectId(usuarioId))
        );
        return mongoTemplate.find(query, SolicitudDeIntercambio.class);
    }

    @Override
    public List<SolicitudDeIntercambio> findByUsuarioId(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("usuario").is(new ObjectId(usuarioId))),
                SolicitudDeIntercambio.class
        );
    }

    @Override
    public List<SolicitudDeIntercambio> findByFiguritaIds(List<String> figuritaIds) {
        List<ObjectId> objectIds = figuritaIds.stream().map(ObjectId::new).toList();
        Query query = Query.query(Criteria.where("figurita").in(objectIds));
        return mongoTemplate.find(query, SolicitudDeIntercambio.class);
    }
}
