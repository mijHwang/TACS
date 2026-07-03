package com.grupo3.tp.repository;

import com.grupo3.tp.models.Faltante;
import com.grupo3.tp.models.Usuario;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

public class UsuarioRepositoryImpl implements UsuarioRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    UsuarioRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<Usuario> findUsuariosQueLesFaltaFigurita(String figuritaBaseId) {
        // Usuarios que DECLARARON esta base en su wishlist (colección "faltantes").
        // Faltante guarda figuritaBaseId y usuarioId como String.
        List<String> usuarioIds = mongoTemplate.findDistinct(
                Query.query(Criteria.where("figuritaBaseId").is(figuritaBaseId)),
                "usuarioId", "faltantes", Faltante.class, String.class);

        if (usuarioIds.isEmpty()) {
            return List.of();
        }
        List<ObjectId> objectIds = usuarioIds.stream().map(ObjectId::new).toList();
        return mongoTemplate.find(
                Query.query(Criteria.where("_id").in(objectIds)), Usuario.class);
    }
}
