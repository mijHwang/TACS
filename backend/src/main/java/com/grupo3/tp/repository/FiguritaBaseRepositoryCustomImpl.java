package com.grupo3.tp.repository;

import com.grupo3.tp.dtos.CatalogoFiltro;
import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.models.Figurita;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

import static com.grupo3.tp.repository.FiguritaRepositoryCustomImpl.containsIgnoreCase;
import static com.grupo3.tp.repository.FiguritaRepositoryCustomImpl.totalFrom;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.*;

public class FiguritaBaseRepositoryCustomImpl implements FiguritaBaseRepositoryCustom {

    private static final String COLLECTION = "figuritas_base";

    private final MongoTemplate mongoTemplate;

    FiguritaBaseRepositoryCustomImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<FiguritaBaseDTO> findFaltantesPaged(CatalogoFiltro filtro, Pageable pageable) {
        // Bases que el usuario YA tiene (ids livianos, sin cargar las figuritas completas).
        List<ObjectId> owned = mongoTemplate.findDistinct(
                Query.query(Criteria.where("owner").is(new ObjectId(filtro.usuarioId()))),
                "figuritaBase", "figuritas", Figurita.class, ObjectId.class);

        List<Criteria> filtros = new ArrayList<>();
        if (!owned.isEmpty()) {
            filtros.add(Criteria.where("_id").nin(owned));
        }
        addNombreFilters(filtros, filtro);
        return aggregate(filtros, pageable);
    }

    @Override
    public Page<FiguritaBaseDTO> searchPaged(String search, Pageable pageable) {
        List<Criteria> filtros = new ArrayList<>();
        if (StringUtils.hasText(search)) {
            List<Criteria> or = new ArrayList<>();
            or.add(Criteria.where("jug.nombre").regex(containsIgnoreCase(search)));
            or.add(Criteria.where("sel.nombre").regex(containsIgnoreCase(search)));
            Integer numero = tryParseInt(search);
            if (numero != null) {
                or.add(Criteria.where("numero").is(numero));
            }
            filtros.add(new Criteria().orOperator(or.toArray(new Criteria[0])));
        }
        return aggregate(filtros, pageable);
    }

    /**
     * Pipeline sobre {@code figuritas_base}: lookups de selección/equipo/categoría/jugador,
     * los {@code filtros} provistos, sort por número y página. El {@code _id} se mapea a
     * {@link FiguritaBaseDTO#getId()}.
     */
    private Page<FiguritaBaseDTO> aggregate(List<Criteria> filtros, Pageable pageable) {
        List<AggregationOperation> base = new ArrayList<>();
        base.add(lookup("selecciones", "seleccion", "_id", "sel"));
        base.add(unwind("sel", true));
        base.add(lookup("equipos", "equipo", "_id", "eq"));
        base.add(unwind("eq", true));
        base.add(lookup("categorias_figurita", "categoria", "_id", "cat"));
        base.add(unwind("cat", true));
        base.add(lookup("jugadores", "jugador", "_id", "jug"));
        base.add(unwind("jug", true));
        if (!filtros.isEmpty()) {
            base.add(match(new Criteria().andOperator(filtros.toArray(new Criteria[0]))));
        }

        List<AggregationOperation> contentOps = new ArrayList<>(base);
        contentOps.add(sort(Sort.by(Sort.Direction.ASC, "numero")));
        contentOps.add(skip(pageable.getOffset()));
        contentOps.add(limit(pageable.getPageSize()));
        contentOps.add(project("numero", "imagenUrl")
                .and("jug.nombre").as("jugadorNombre")
                .and("sel.nombre").as("seleccionNombre")
                .and("eq.nombre").as("equipoNombre")
                .and("cat.nombre").as("categoriaNombre"));

        List<FiguritaBaseDTO> content = mongoTemplate
                .aggregate(newAggregation(contentOps), COLLECTION, FiguritaBaseDTO.class)
                .getMappedResults();

        List<AggregationOperation> countOps = new ArrayList<>(base);
        countOps.add(count().as("total"));
        AggregationResults<Document> countRes =
                mongoTemplate.aggregate(newAggregation(countOps), COLLECTION, Document.class);
        long total = totalFrom(countRes);

        return PageableExecutionUtils.getPage(content, pageable, () -> total);
    }

    private void addNombreFilters(List<Criteria> filtros, CatalogoFiltro filtro) {
        if (filtro.numero() != null) {
            filtros.add(Criteria.where("numero").is(filtro.numero()));
        }
        if (StringUtils.hasText(filtro.search())) {
            filtros.add(Criteria.where("jug.nombre").regex(containsIgnoreCase(filtro.search())));
        }
        if (StringUtils.hasText(filtro.seleccion())) {
            filtros.add(Criteria.where("sel.nombre").regex(containsIgnoreCase(filtro.seleccion())));
        }
        if (StringUtils.hasText(filtro.equipo())) {
            filtros.add(Criteria.where("eq.nombre").regex(containsIgnoreCase(filtro.equipo())));
        }
        if (StringUtils.hasText(filtro.categoria())) {
            filtros.add(Criteria.where("cat.nombre").regex(containsIgnoreCase(filtro.categoria())));
        }
    }

    private static Integer tryParseInt(String s) {
        try {
            return Integer.valueOf(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
