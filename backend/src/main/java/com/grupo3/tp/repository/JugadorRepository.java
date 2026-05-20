package com.grupo3.tp.repository;

import com.grupo3.tp.models.Jugador;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JugadorRepository extends MongoRepository<Jugador, String> {}
