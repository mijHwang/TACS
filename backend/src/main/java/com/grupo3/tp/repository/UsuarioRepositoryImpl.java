package com.grupo3.tp.repository;

import com.grupo3.tp.models.Figurita;
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
        // Owners que YA tienen al menos una figurita de esa base (mismo patrón que
        // FiguritaBaseRepositoryCustomImpl#findFaltantesPaged, pero invertido). En la
        // colección "figuritas", tanto owner como figuritaBase se guardan como ObjectId.
        List<ObjectId> ownersConLaBase = mongoTemplate.findDistinct(
                Query.query(Criteria.where("figuritaBase").is(new ObjectId(figuritaBaseId))),
                "owner", "figuritas", Figurita.class, ObjectId.class);

        // Usuarios cuyo _id NO está en ese set → les falta la figurita.
        Query query = new Query();
        if (!ownersConLaBase.isEmpty()) {
            query.addCriteria(Criteria.where("_id").nin(ownersConLaBase));
        }
        return mongoTemplate.find(query, Usuario.class);
    }
}
