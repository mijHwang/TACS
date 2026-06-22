package com.grupo3.tp.repository;

import com.grupo3.tp.models.Usuario;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends MongoRepository<Usuario, String> {
    Optional<Usuario> findByUsername(String username);
    List<Usuario> findByUsernameContainingIgnoreCase(String search);
}
