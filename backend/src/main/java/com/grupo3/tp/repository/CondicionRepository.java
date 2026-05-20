package com.grupo3.tp.repository;

import com.grupo3.tp.models.CondicionImpl;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CondicionRepository extends MongoRepository<CondicionImpl, String> {}
