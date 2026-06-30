package com.grupo3.tp.repository;

import com.grupo3.tp.models.FiguritaPublicada;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FiguritaPublicadaRepository extends MongoRepository<FiguritaPublicada, String>, FiguritaPublicadaRepositoryCustom {}