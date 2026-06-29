package com.grupo3.tp.service;

import com.grupo3.tp.dtos.IntercambioResponseDTO;
import com.grupo3.tp.dtos.ReputacionResponseDTO;
import com.grupo3.tp.models.Intercambio;
import com.grupo3.tp.repository.IntercambioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class IntercambioService {

    private final IntercambioRepository repository;

    public IntercambioService(IntercambioRepository repository) {
        this.repository = repository;
    }

    public Intercambio crear(Intercambio intercambio) {
        return repository.save(intercambio);
    }

    public Optional<Intercambio> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public List<Intercambio> obtenerTodos() {
        return repository.findAll();
    }

    public Optional<Intercambio> actualizar(String id, Intercambio intercambio) {
        if (!repository.existsById(id)) {
            return Optional.empty();
        }
        intercambio.setId(id);
        return Optional.of(repository.save(intercambio));
    }

    public boolean eliminar(String id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    public List<IntercambioResponseDTO> obtenerPorUsuarioId(String usuarioId) {
        List<Intercambio> lista = repository.findByUsuarioId(usuarioId);

        System.out.println("Encontrados: " + lista.size());

        return repository.findByUsuarioId(usuarioId).stream()
                .map(this::mapToDTO)
                .toList();
    }

    public Intercambio calificar(String intercambioId, String calificadorId, Integer puntaje) {
        Intercambio intercambio = repository.findById(intercambioId)
                .orElseThrow(() -> new RuntimeException("Intercambio no encontrado"));

        if (puntaje < 1 || puntaje > 5) {
            throw new IllegalArgumentException("El puntaje debe ser entre 1 y 5");
        }

        String generadorId = intercambio.getUsuarioGenerador().getId();
        String intercambiadorId = intercambio.getUsuarioIntercambiador().getId();

        if (calificadorId.equals(generadorId)) {
            // generador is rating intercambiador
            if (intercambio.getPuntajeIntercambiador() != null) {
                throw new IllegalArgumentException("Ya calificaste este intercambio");
            }
            intercambio.setPuntajeIntercambiador(puntaje);

        } else if (calificadorId.equals(intercambiadorId)) {
            // intercambiador is rating generador
            if (intercambio.getPuntajeGenerador() != null) {
                throw new IllegalArgumentException("Ya calificaste este intercambio");
            }
            intercambio.setPuntajeGenerador(puntaje);

        } else {
            throw new IllegalArgumentException("No sos parte de este intercambio");
        }

        return repository.save(intercambio);
    }


    public ReputacionResponseDTO calcularReputacion(String usuarioId) {
        List<Intercambio> intercambios = repository.findByUsuarioId(usuarioId);

        int total = 0;
        double suma = 0;
        int[] counts = new int[6]; // Índices 1 a 5

        for (Intercambio i : intercambios) {
            Integer puntajeRecibido = null;

            // Extraer el puntaje dependiendo de si el usuario generó o aceptó el intercambio
            if (i.getUsuarioGenerador().getId().equals(usuarioId)) {
                puntajeRecibido = i.getPuntajeGenerador();
            } else if (i.getUsuarioIntercambiador().getId().equals(usuarioId)) {
                puntajeRecibido = i.getPuntajeIntercambiador();
            }

            // Si hay un puntaje válido, sumar a las estadísticas
            if (puntajeRecibido != null && puntajeRecibido >= 1 && puntajeRecibido <= 5) {
                total++;
                suma += puntajeRecibido;
                counts[puntajeRecibido]++;
            }
        }

        double score = total > 0 ? Math.round((suma / total) * 10.0) / 10.0 : 0.0;

        // El constructor es inyectado por @AllArgsConstructor de Lombok
        return new ReputacionResponseDTO(
                score,
                total,
                counts[5],
                counts[4],
                counts[3],
                counts[2],
                counts[1]
        );
    }


    public IntercambioResponseDTO mapToDTO(Intercambio intercambio) {
        return new IntercambioResponseDTO(
                intercambio.getId(),

                intercambio.getUsuarioGenerador().getId(),
                intercambio.getUsuarioGenerador().getUsername(),

                intercambio.getUsuarioIntercambiador().getId(),
                intercambio.getUsuarioIntercambiador().getUsername(),

                intercambio.getFigurita().getId(),
                intercambio.getFigurita().getFiguritaBase().getJugador().getNombre(),

                intercambio.getFiguritaIntercambiada().stream()
                        .map(f -> f.getFiguritaBase().getJugador().getNombre())
                        .toList(),

                intercambio.getFecha(),

                intercambio.getPuntajeGenerador(),
                intercambio.getPuntajeIntercambiador()
        );
    }
}
