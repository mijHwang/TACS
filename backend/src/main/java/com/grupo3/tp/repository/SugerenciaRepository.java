package com.grupo3.tp.repository;

import com.grupo3.tp.models.Sugerencia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SugerenciaRepository extends MongoRepository<Sugerencia, String> {
    List<Sugerencia> findByUsuarioId(String usuarioId);
    Page<Sugerencia> findByUsuarioId(String usuarioId, Pageable pageable);
    void deleteByUsuarioId(String usuarioId);
}
