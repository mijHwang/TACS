package com.grupo3.tp.repository;

import com.grupo3.tp.models.Usuario;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

public class UsuarioRepositoryImpl implements UsuarioRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public UsuarioRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<Usuario> findUsuariosQueLesFaltaFigurita(String figuritaBaseId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("figuritas.figuritaBase").ne(new ObjectId(figuritaBaseId))),
                Usuario.class
        );
    }
}