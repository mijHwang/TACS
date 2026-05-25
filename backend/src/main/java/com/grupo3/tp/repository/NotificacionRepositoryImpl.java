package com.grupo3.tp.repository;

import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.models.SolicitudDeIntercambio;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

public class NotificacionRepositoryImpl {

    MongoTemplate mongoTemplate;

    public NotificacionRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    List<Notificacion> findByUsuarioId(String usuarioId){
        return mongoTemplate.find(
                Query.query(Criteria.where("usuario").is(new ObjectId(usuarioId))),
                Notificacion.class
        );
    }

}
