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

        // Map GROUPS, not individual figuritas
        return all.stream()
                .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()))
                .values().stream()
                .filter(group -> group.size() > 1)
                .map(group -> new FiguritaResponseDTO(
                        group.get(0).getId(),
                        group.get(0).getFiguritaBase().getNumero(),
                        group.get(0).getFiguritaBase().getId(),
                        group.size(),  // count
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

}