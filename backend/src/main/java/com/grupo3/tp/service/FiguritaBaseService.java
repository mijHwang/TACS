package com.grupo3.tp.service;

import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.repository.FiguritaBaseRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FiguritaBaseService {

    private final FiguritaBaseRepository repository;

    public FiguritaBaseService(FiguritaBaseRepository repository) {
        this.repository = repository;
    }

    public FiguritaBase crear(FiguritaBase figuritaBase) {
        return repository.save(figuritaBase);
    }

    public Optional<FiguritaBase> obtenerPorId(String id) {

        return repository.findById(id);
    }

    public List<FiguritaBase> obtenerTodas() {
        return repository.findAll();
    }

    public Optional<FiguritaBase> actualizar(String id, FiguritaBase figuritaBase) {
        if (!repository.existsById(id)) {
            return Optional.empty();
        }
        figuritaBase.setId(id);
        return Optional.of(repository.save(figuritaBase));
    }

    public boolean eliminar(String id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }
}
