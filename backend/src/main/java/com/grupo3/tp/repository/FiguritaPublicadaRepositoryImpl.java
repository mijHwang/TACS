package com.grupo3.tp.repository;

import com.grupo3.tp.models.EstadoPublicacion;
import com.grupo3.tp.models.FiguritaPublicada;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

import java.util.List;

public class FiguritaPublicadaRepositoryImpl implements FiguritaPublicadaRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    FiguritaPublicadaRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<FiguritaPublicada> findDisponibles(String usuarioId, Pageable pageable) {
        // estado == DISPONIBLE AND usuario != caller (la referencia @DocumentReference
        // se persiste como ObjectId, así que comparamos con un ObjectId).
        Query query = Query.query(
                Criteria.where("estado").is(EstadoPublicacion.DISPONIBLE)
                        .and("usuario").ne(new ObjectId(usuarioId))
        );

        long total = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), FiguritaPublicada.class);
        query.with(pageable);
        List<FiguritaPublicada> list = mongoTemplate.find(query, FiguritaPublicada.class);
        return PageableExecutionUtils.getPage(list, pageable, () -> total);
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