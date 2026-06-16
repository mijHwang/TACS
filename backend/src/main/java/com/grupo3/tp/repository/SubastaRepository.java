package com.grupo3.tp.repository;

import com.grupo3.tp.models.Subasta;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubastaRepository extends MongoRepository<Subasta, String>, SubastaRepositoryCustom {}