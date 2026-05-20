package com.grupo3.tp.repository;

import com.grupo3.tp.models.Figurita;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FiguritaRepository extends MongoRepository<Figurita, String> {}
