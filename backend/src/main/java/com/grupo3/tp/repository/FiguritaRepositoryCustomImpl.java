package com.grupo3.tp.repository;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
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
    public List<FiguritaResponseDTO> findRepetidas(String usuarioId) {
        System.out.println("Finding repetidas for user: " + usuarioId);

        List<Figurita> all = mongoTemplate.find(
                Query.query(Criteria.where("owner").is(new ObjectId(usuarioId))),
                Figurita.class
        );
        System.out.println("Found figuritas count: " + all.size());

        List<Figurita> repetidas = all.stream()
                .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()))
                .values().stream()
                .filter(group -> group.size() > 1)
                .flatMap(List::stream)
                .toList();


        System.out.println("Repetidas count after filter: " + repetidas.size());
        System.out.println("Figuritas " + repetidas);

        // Eagerly load and map to DTO
        return repetidas.stream()
                .map(f -> new FiguritaResponseDTO(
                        f.getId(),
                        f.getFiguritaBase().getNumero(),
                        f.getFiguritaBase().getJugador().getNombre(),
                        f.getFiguritaBase().getSeleccion().getNombre(),
                        f.getFiguritaBase().getEquipo().getNombre(),
                        f.getFiguritaBase().getCategoria().getNombre()
                ))
                .toList();


    }

}
