package com.grupo3.tp.repository;

import com.grupo3.tp.models.Calificacion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CalificacionRepository extends MongoRepository<Calificacion, String> {}
