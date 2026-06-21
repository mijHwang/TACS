package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.FiguritaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class FiguritaService {

    private final FiguritaRepository repository;

    public FiguritaService(FiguritaRepository repository) {
        this.repository = repository;
    }

    public Figurita crear(Figurita figurita) {
        return repository.save(figurita);
    }

    public Optional<Figurita> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public List<FiguritaResponseDTO> obtenerPorUserId(String userId) {
        List<Figurita> all = repository.findByFiguritaOwnerId(userId);

        return all.stream()
                .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()))
                .values().stream()
                .map(group -> new FiguritaResponseDTO(
                        group.get(0).getId(),
                        group.get(0).getFiguritaBase().getNumero(),
                        group.get(0).getFiguritaBase().getId(),
                        group.size(),  // count
                        group.get(0).getFiguritaBase().getJugador().getNombre(),
                        group.get(0).getFiguritaBase().getSeleccion().getNombre(),
                        group.get(0).getFiguritaBase().getEquipo().getNombre(),
                        group.get(0).getFiguritaBase().getCategoria().getNombre(),
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername()
                ))
                .toList();
    }

    public List<FiguritaResponseDTO> obtenerFaltantes(String userId) {

        List<FiguritaResponseDTO> todas = obtenerTodas();

        System.out.println("=== FALTANTES DEBUG ===");
        System.out.println("User has (IDs): ");
        System.out.println("All figuritas (count): " + todas.size());
        System.out.println("All IDs: " + todas.stream().map(FiguritaResponseDTO::getFiguritaBaseId).collect(Collectors.toSet()));



        List<FiguritaResponseDTO> misFiguritas = obtenerPorUserId(userId);
        Set<String> misFiguritasBaseIds = misFiguritas.stream()
                .map(FiguritaResponseDTO::getFiguritaBaseId)
                .collect(Collectors.toSet());

        System.out.println("Faltantes (count): ");
        System.out.println("======================");

        return todas.stream()
                .filter(f -> !misFiguritasBaseIds.contains(f.getFiguritaBaseId()))
                .toList();
    }

    public List<FiguritaResponseDTO> obtenerTodas() {
        List<Figurita> all = repository.findAll();

        return all.stream()
                .collect(Collectors.groupingBy(f -> f.getFiguritaBase().getId()))
                .values().stream()
                .map(group -> new FiguritaResponseDTO(
                        group.get(0).getId(),
                        group.get(0).getFiguritaBase().getNumero(),
                        group.get(0).getFiguritaBase().getId(),  // figuritaBaseId
                        group.size(),  // count
                        group.get(0).getFiguritaBase().getJugador().getNombre(),
                        group.get(0).getFiguritaBase().getSeleccion().getNombre(),
                        group.get(0).getFiguritaBase().getEquipo().getNombre(),
                        group.get(0).getFiguritaBase().getCategoria().getNombre(),
                        group.get(0).getOwner().getId(),
                        group.get(0).getOwner().getUsername()
                ))
                .toList();

    }

    public List<FiguritaResponseDTO> obtenerTodasSinAgrupar() {
        return repository.findAll().stream()
                .map(figurita -> new FiguritaResponseDTO(
                        figurita.getId(),
                        figurita.getFiguritaBase().getNumero(),
                        figurita.getFiguritaBase().getId(),
                        1,  // count = 1
                        figurita.getFiguritaBase().getJugador().getNombre(),
                        figurita.getFiguritaBase().getSeleccion().getNombre(),
                        figurita.getFiguritaBase().getEquipo().getNombre(),
                        figurita.getFiguritaBase().getCategoria().getNombre(),
                        figurita.getOwner().getId(),
                        figurita.getOwner().getUsername()
                ))
                .toList();
    }

    public List<Figurita> obtenerTodasInternaPorUserId(String userId){

        List<Figurita> all = repository.findByFiguritaOwnerId(userId);
        return all;
    }

    public Optional<Figurita> actualizar(String id, Figurita figurita) {
        if (!repository.existsById(id)) {
            return Optional.empty();
        }
        figurita.setId(id);
        return Optional.of(repository.save(figurita));
    }



    public boolean eliminar(String id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    public Optional<Figurita> transferir(String figuritaId, Usuario newOwner) {

        if (!repository.existsById(figuritaId)){
            return Optional.empty();
        }

        Figurita figurita = repository.findById(figuritaId).orElseThrow();
      
        figurita.setOwner(newOwner);

        Figurita updated = repository.save(figurita);
        return Optional.of(updated);
    }

    public List<FiguritaResponseDTO> obtenerRepetidas(String usuarioId) {
        return repository.findRepetidas(usuarioId);
    }
}
