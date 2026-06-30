package com.grupo3.tp.repository;

import com.grupo3.tp.models.EstadoPublicacion;
import com.grupo3.tp.models.FiguritaPublicada;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

public class FiguritaPublicadaRepositoryImpl implements FiguritaPublicadaRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    FiguritaPublicadaRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<FiguritaPublicada> findDisponibles() {
        Query query = Query.query(
                Criteria.where("estado").is(EstadoPublicacion.DISPONIBLE)
        );
        return mongoTemplate.find(query, FiguritaPublicada.class);
    }

    @Override
    public List<FiguritaPublicada> findByUsuarioId(String usuarioId) {
        Query query = Query.query(
                Criteria.where("usuario").is(new ObjectId(usuarioId))
        );
        return mongoTemplate.find(query, FiguritaPublicada.class);
    }

    @Override
    public List<FiguritaPublicada> findByFiguritaBaseId(String figuritaBaseId) {
        Query query = Query.query(
                Criteria.where("figuritaBaseId").is(figuritaBaseId)
                        .and("estado").is(EstadoPublicacion.DISPONIBLE)
        );
        return mongoTemplate.find(query, FiguritaPublicada.class);
    }
    @Override
    public List<FiguritaPublicada> findByFiguritaId(String figuritaId) {
        Query query = Query.query(
                Criteria.where("figuritas").is(new ObjectId(figuritaId))
                        .and("estado").is(EstadoPublicacion.DISPONIBLE)
        );
        return mongoTemplate.find(query, FiguritaPublicada.class);
    }

    
}