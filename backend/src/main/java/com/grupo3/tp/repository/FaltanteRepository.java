package com.grupo3.tp.repository;

import com.grupo3.tp.models.Faltante;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaltanteRepository extends MongoRepository<Faltante, String> {
    List<Faltante> findByUsuarioId(String usuarioId);
    Page<Faltante> findByUsuarioId(String usuarioId, Pageable pageable);
    boolean existsByUsuarioIdAndFiguritaBaseId(String usuarioId, String figuritaBaseId);
    long deleteByUsuarioIdAndFiguritaBaseId(String usuarioId, String figuritaBaseId);
    List<Faltante> findByFiguritaBaseId(String figuritaBaseId);
}
