package com.grupo3.tp.repository;

import com.grupo3.tp.models.Figurita;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

public class FiguritaRepositoryCustomImpl implements FiguritaRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    FiguritaRepositoryCustomImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<Figurita> findByFiguritaOwnerId(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("owner").is(new ObjectId(usuarioId))),
                Figurita.class
        );
    }

}
