package com.grupo3.tp.repository;

import com.grupo3.tp.models.EstadoSubasta;
import com.grupo3.tp.models.Subasta;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

import java.time.LocalDateTime;
import java.util.List;

public class SubastaRepositoryImpl implements SubastaRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public SubastaRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<Subasta> findByUsuarioId(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("usuario").is(new ObjectId(usuarioId))),
                Subasta.class
        );
    }

    @Override
    public List<Subasta> findByParticipating(String usuarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("ofertas.usuario").is(new ObjectId(usuarioId))),
                Subasta.class
        );
    }

    @Override
    public List<Subasta> findByEstadoAndHoraFinBefore(EstadoSubasta estado, LocalDateTime ahora) {
        return mongoTemplate.find(
                Query.query(Criteria.where("estado").is(estado)
                        .and("horaFin").lt(ahora)),
                Subasta.class
        );
    }

    @Override
    public List<Subasta> findByFiguritaId(String figuritaId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("figurita").is(new ObjectId(figuritaId))
                        .and("estado").in(EstadoSubasta.PENDIENTE, EstadoSubasta.EN_CURSO)),
                Subasta.class
        );
    }

    @Override
    public Page<Subasta> findAllPaged(EstadoSubasta estado, Pageable pageable) {
        Query query = new Query();
        if (estado != null) {
            query.addCriteria(Criteria.where("estado").is(estado));
        }
        return paginate(query, pageable);
    }

    @Override
    public Page<Subasta> findByUsuarioIdPaged(String usuarioId, Pageable pageable) {
        Query query = Query.query(Criteria.where("usuario").is(new ObjectId(usuarioId)));
        return paginate(query, pageable);
    }

    @Override
    public Page<Subasta> findByParticipatingPaged(String usuarioId, Pageable pageable) {
        Query query = Query.query(Criteria.where("ofertas.usuario").is(new ObjectId(usuarioId)));
        return paginate(query, pageable);
    }

    private Page<Subasta> paginate(Query query, Pageable pageable) {
        long total = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Subasta.class);
        query.with(pageable);
        List<Subasta> list = mongoTemplate.find(query, Subasta.class);
        return PageableExecutionUtils.getPage(list, pageable, () -> total);
    }

}