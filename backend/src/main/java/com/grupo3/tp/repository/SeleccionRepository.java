package com.grupo3.tp.repository;

import com.grupo3.tp.models.Seleccion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SeleccionRepository extends MongoRepository<Seleccion, String> {}
