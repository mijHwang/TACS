package com.grupo3.tp.repository;

import com.grupo3.tp.dtos.CatalogoFiltro;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
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
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.*;

public class FiguritaRepositoryCustomImpl implements FiguritaRepositoryCustom {

    private static final String COLLECTION = "figuritas";

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
    public List<FiguritaResponseDTO> findRepetidas(String usuarioId) {
        List<Figurita> all = mongoTemplate.find(
                Query.query(Criteria.where("owner").is(new ObjectId(usuarioId))),
                Figurita.class
        );
        return all.stream()
                .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()))
                .values().stream()
                .filter(group -> group.size() > 1)
                .map(group -> new FiguritaResponseDTO(
                        group.get(0).getId(),
                        group.get(0).getFiguritaBase().getNumero(),
                        group.get(0).getFiguritaBase().getId(),
                        group.size(),
                        group.get(0).getFiguritaBase().getJugador().getNombre(),
                        group.get(0).getFiguritaBase().getSeleccion().getNombre(),
                        group.get(0).getFiguritaBase().getEquipo().getNombre(),
                        group.get(0).getFiguritaBase().getCategoria().getNombre(),
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername(),
                        group.get(0).getFiguritaBase().getImagenUrl()
                ))
                .toList();
    }

    // ── Paginados (aggregation) ───────────────────────────────────────────────

    @Override
    public Page<FiguritaResponseDTO> findCatalogoPaged(CatalogoFiltro filtro, Pageable pageable) {
        // Catálogo: una entrada por base, EXCLUYENDO las figuritas del caller.
        Criteria ownerCriteria = filtro.usuarioId() != null
                ? Criteria.where("owner").ne(new ObjectId(filtro.usuarioId()))
                : null;
        return aggregateGrouped(ownerCriteria, false, filtro, pageable);
    }

    @Override
    public Page<FiguritaResponseDTO> findByOwnerPaged(CatalogoFiltro filtro, Pageable pageable) {
        // Colección: una entrada por base, SÓLO las figuritas del dueño.
        Criteria ownerCriteria = Criteria.where("owner").is(new ObjectId(filtro.usuarioId()));
        return aggregateGrouped(ownerCriteria, false, filtro, pageable);
    }

    @Override
    public Page<FiguritaResponseDTO> findRepetidasPaged(CatalogoFiltro filtro, Pageable pageable) {
        // Repetidas: igual a la colección pero sólo grupos con count > 1.
        Criteria ownerCriteria = Criteria.where("owner").is(new ObjectId(filtro.usuarioId()));
        return aggregateGrouped(ownerCriteria, true, filtro, pageable);
    }

    /**
     * Pipeline común agrupado por figurita-base sobre la colección {@code figuritas}:
     * match de owner → group (count + representante) → (repetidas) match count>1 →
     * lookups de base + selección/equipo/categoría/jugador/owner → match de filtros →
     * sort por número. Se ejecuta dos veces: una para el contenido de la página (skip/limit/project)
     * y otra para el total (count), y se arma el {@link Page} con {@link PageableExecutionUtils}.
     */
    private Page<FiguritaResponseDTO> aggregateGrouped(
            Criteria ownerCriteria, boolean soloRepetidas, CatalogoFiltro filtro, Pageable pageable) {

        List<AggregationOperation> base = new ArrayList<>();
        if (ownerCriteria != null) {
            base.add(match(ownerCriteria));
        }
        base.add(group("figuritaBase")
                .count().as("count")
                .first("_id").as("repId")
                .first("owner").as("ownerId"));
        if (soloRepetidas) {
            base.add(match(Criteria.where("count").gt(1)));
        }
        base.add(lookup("figuritas_base", "_id", "_id", "base"));
        base.add(unwind("base"));
        base.add(lookup("selecciones", "base.seleccion", "_id", "sel"));
        base.add(unwind("sel", true));
        base.add(lookup("equipos", "base.equipo", "_id", "eq"));
        base.add(unwind("eq", true));
        base.add(lookup("categorias_figurita", "base.categoria", "_id", "cat"));
        base.add(unwind("cat", true));
        base.add(lookup("jugadores", "base.jugador", "_id", "jug"));
        base.add(unwind("jug", true));
        base.add(lookup("usuarios", "ownerId", "_id", "own"));
        base.add(unwind("own", true));
        Criteria filtros = buildFilterCriteria(filtro);
        if (filtros != null) {
            base.add(match(filtros));
        }

        // ── contenido de la página ──
        List<AggregationOperation> contentOps = new ArrayList<>(base);
        // Tiebreaker _id asc: numero no es único (admin puede crear bases con número repetido),
        // y sin desempate determinista el skip/limit puede repetir u omitir filas entre páginas.
        contentOps.add(sort(Sort.by(Sort.Direction.ASC, "base.numero")
                .and(Sort.by(Sort.Direction.ASC, "_id"))));
        contentOps.add(skip(pageable.getOffset()));
        contentOps.add(limit(pageable.getPageSize()));
        // Spring Data mapea FiguritaResponseDTO.id desde el _id del documento, así que el
        // representante (repId = id de una Figurita) va a _id; la clave del grupo (figurita-base)
        // va a figuritaBaseId. $project evalúa todas las expresiones contra el documento de entrada.
        contentOps.add(project()
                .and("repId").as("_id")
                .and("_id").as("figuritaBaseId")
                .and("base.numero").as("numero")
                .and("count").as("count")
                .and("jug.nombre").as("jugadorNombre")
                .and("sel.nombre").as("seleccionNombre")
                .and("eq.nombre").as("equipoNombre")
                .and("cat.nombre").as("categoriaNombre")
                .and("ownerId").as("ownerId")
                .and("own.username").as("ownerName")
                .and("base.imagenUrl").as("imagenUrl"));

        List<FiguritaResponseDTO> content = mongoTemplate
                .aggregate(newAggregation(contentOps), COLLECTION, FiguritaResponseDTO.class)
                .getMappedResults();

        // ── total ──
        List<AggregationOperation> countOps = new ArrayList<>(base);
        countOps.add(count().as("total"));
        AggregationResults<Document> countRes =
                mongoTemplate.aggregate(newAggregation(countOps), COLLECTION, Document.class);
        long total = totalFrom(countRes);

        return PageableExecutionUtils.getPage(content, pageable, () -> total);
    }

    private Criteria buildFilterCriteria(CatalogoFiltro filtro) {
        List<Criteria> cs = new ArrayList<>();
        if (filtro.numero() != null) {
            cs.add(Criteria.where("base.numero").is(filtro.numero()));
        }
        if (StringUtils.hasText(filtro.figuritaBaseId())) {
            cs.add(Criteria.where("_id").is(new ObjectId(filtro.figuritaBaseId())));
        }
        if (StringUtils.hasText(filtro.search())) {
            cs.add(Criteria.where("jug.nombre").regex(containsIgnoreCase(filtro.search())));
        }
        if (StringUtils.hasText(filtro.seleccion())) {
            cs.add(Criteria.where("sel.nombre").regex(containsIgnoreCase(filtro.seleccion())));
        }
        if (StringUtils.hasText(filtro.equipo())) {
            cs.add(Criteria.where("eq.nombre").regex(containsIgnoreCase(filtro.equipo())));
        }
        if (StringUtils.hasText(filtro.categoria())) {
            cs.add(Criteria.where("cat.nombre").regex(containsIgnoreCase(filtro.categoria())));
        }
        if (cs.isEmpty()) return null;
        return new Criteria().andOperator(cs.toArray(new Criteria[0]));
    }

    /** Regex PCRE para "contiene" sin distinguir mayúsculas; escapa el texto del usuario. */
    static Pattern containsIgnoreCase(String text) {
        return Pattern.compile(Pattern.quote(text), Pattern.CASE_INSENSITIVE);
    }

    static long totalFrom(AggregationResults<Document> countRes) {
        List<Document> docs = countRes.getMappedResults();
        if (docs.isEmpty()) return 0L;
        Number total = docs.get(0).get("total", Number.class);
        return total == null ? 0L : total.longValue();
    }
}
