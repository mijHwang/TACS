package com.grupo3.tp.repository;

import com.grupo3.tp.models.Figurita;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;
import java.util.stream.Collectors;

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

    @Override
    public List<Figurita> findRepetidas(String usuarioId) {
        List<Figurita> all = mongoTemplate.find(
                Query.query(Criteria.where("owner").is(new ObjectId(usuarioId))),
                Figurita.class
        );

        // Group by figuritaBase and filter for duplicates (2+)
        return all.stream()
                .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()))
                .values().stream()
                .filter(group -> group.size() > 1)
                .flatMap(List::stream)
                .toList();
    }

}
