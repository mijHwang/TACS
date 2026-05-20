package com.grupo3.tp.repository;

import com.grupo3.tp.models.Intercambio;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IntercambioRepository extends MongoRepository<Intercambio, String> {}
