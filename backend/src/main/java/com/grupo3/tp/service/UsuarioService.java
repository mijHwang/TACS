package com.grupo3.tp.service;

import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioService {

    private final UsuarioRepository repository;

    public UsuarioService(UsuarioRepository repository) {
        this.repository = repository;
    }

    public Usuario loadUserByUsername(String username){
        Optional<Usuario> usuario = this.repository.findByUsername(username);
        if(usuario.isEmpty()){
            throw new UsernameNotFoundException("no se encontro el usuairo de username: "+" "+username);
        }
        return usuario.get();
    }

    public List<Usuario> searchByUsername(String search) {
        return repository.findByUsernameContainingIgnoreCase(search);
    }

    public Usuario crear(Usuario usuario) {
        return repository.save(usuario);
    }

    public Optional<Usuario> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public List<Usuario> obtenerTodos() {
        return repository.findAll();
    }

    public Optional<Usuario> actualizar(String id, Usuario usuario) {
        if (!repository.existsById(id)) {
            return Optional.empty();
        }
        usuario.setId(id);
        return Optional.of(repository.save(usuario));
    }

    public boolean eliminar(String id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }
}
