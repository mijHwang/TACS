package com.grupo3.tp.repository;

import com.grupo3.tp.models.Notificacion;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

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

    Page<Notificacion> findByUsuarioId(String usuarioId, Pageable pageable) {
        Query query = Query.query(Criteria.where("usuario").is(new ObjectId(usuarioId)));
        long total = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Notificacion.class);
        query.with(pageable);
        List<Notificacion> list = mongoTemplate.find(query, Notificacion.class);
        return PageableExecutionUtils.getPage(list, pageable, () -> total);
    }

}
