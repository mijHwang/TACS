package com.grupo3.tp.repository;

import com.grupo3.tp.models.FiguritaBase;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FiguritaBaseRepository extends MongoRepository<FiguritaBase, String>, FiguritaBaseRepositoryCustom {}
