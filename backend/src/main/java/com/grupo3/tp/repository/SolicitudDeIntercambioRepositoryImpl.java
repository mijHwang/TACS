package com.grupo3.tp.repository;

import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.SolicitudDeIntercambio;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class SolicitudDeIntercambioRepositoryImpl implements SolicitudDeIntercambioRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public SolicitudDeIntercambioRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<SolicitudDeIntercambio> findByFiguritaOwnerId(String usuarioId) {
        List<ObjectId> figuritaIds = figuritaIdsDeOwner(usuarioId);
        if (figuritaIds.isEmpty()) {
            return Collections.emptyList();
        }
        return mongoTemplate.find(
                Query.query(Criteria.where("figurita").in(figuritaIds)),
                SolicitudDeIntercambio.class
        );
    }

    @Override
    public List<SolicitudDeIntercambio> findByUsuarioId(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("usuario").is(new ObjectId(usuarioId))),
                SolicitudDeIntercambio.class
        );
    }

    @Override
    public Page<SolicitudDeIntercambio> findByFiguritaOwnerId(String usuarioId, Pageable pageable) {
        // "Recibidas": solicitudes cuya figurita deseada pertenece a usuarioId.
        // La referencia @DocumentReference se persiste como ObjectId, así que primero
        // resolvemos los _id de las figuritas de ese owner (consulta indexada sobre
        // la colección figuritas) y luego filtramos por figurita.in(ids). Sin findAll().
        List<ObjectId> figuritaIds = figuritaIdsDeOwner(usuarioId);
        if (figuritaIds.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), pageable, 0);
        }

        Query query = Query.query(Criteria.where("figurita").in(figuritaIds));

        long total = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), SolicitudDeIntercambio.class);
        query.with(pageable);
        List<SolicitudDeIntercambio> list = mongoTemplate.find(query, SolicitudDeIntercambio.class);
        return PageableExecutionUtils.getPage(list, pageable, () -> total);
    }

    @Override
    public Page<SolicitudDeIntercambio> findByUsuarioId(String usuarioId, Pageable pageable) {
        // "Enviadas": solicitudes generadas por usuarioId (campo usuario, guardado como ObjectId).
        Query query = Query.query(Criteria.where("usuario").is(new ObjectId(usuarioId)));

        long total = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), SolicitudDeIntercambio.class);
        query.with(pageable);
        List<SolicitudDeIntercambio> list = mongoTemplate.find(query, SolicitudDeIntercambio.class);
        return PageableExecutionUtils.getPage(list, pageable, () -> total);
    }

    /** Resuelve los _id (ObjectId) de las figuritas cuyo owner es usuarioId. */
    private List<ObjectId> figuritaIdsDeOwner(String usuarioId) {
        Query figuritasQuery = Query.query(Criteria.where("owner").is(new ObjectId(usuarioId)));
        figuritasQuery.fields().include("_id");
        return mongoTemplate.find(figuritasQuery, Figurita.class).stream()
                .map(f -> new ObjectId(f.getId()))
                .collect(Collectors.toList());
    }
}
