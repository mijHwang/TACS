package com.grupo3.tp.repository;

import com.grupo3.tp.models.CategoriaFigurita;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoriaFiguritaRepository extends MongoRepository<CategoriaFigurita, String> {}
