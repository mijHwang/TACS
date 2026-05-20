package com.grupo3.tp.repository;

import com.grupo3.tp.models.Equipo;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EquipoRepository extends MongoRepository<Equipo, String> {}
