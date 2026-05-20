package com.grupo3.tp.repository;

import com.grupo3.tp.models.Oferta;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OfertaRepository extends MongoRepository<Oferta, String> {}
