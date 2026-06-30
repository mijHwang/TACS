package com.grupo3.tp.service;

import com.grupo3.tp.dtos.IntercambioResponseDTO;
import com.grupo3.tp.dtos.ReputacionResponseDTO;
import com.grupo3.tp.models.Calificacion;
import com.grupo3.tp.models.Intercambio;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.CalificacionRepository;
import com.grupo3.tp.repository.IntercambioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class IntercambioService {

    private final IntercambioRepository repository;
    private final CalificacionRepository calificacionRepository;

    public IntercambioService(IntercambioRepository repository,
                              CalificacionRepository calificacionRepository) {
        this.repository = repository;
        this.calificacionRepository = calificacionRepository;
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
        return repository.findByUsuarioId(usuarioId).stream()
                .map(this::mapToDTO)
                .toList();
    }

    public Page<IntercambioResponseDTO> obtenerPorUsuarioId(String usuarioId, Pageable pageable) {
        return repository.findByUsuarioId(usuarioId, pageable)
                .map(this::mapToDTO);
    }

    public Intercambio calificar(String intercambioId, String calificadorId, Integer puntaje) {
        Intercambio intercambio = repository.findById(intercambioId)
                .orElseThrow(() -> new RuntimeException("Intercambio no encontrado"));

        if (puntaje < 1 || puntaje > 5) {
            throw new IllegalArgumentException("El puntaje debe ser entre 1 y 5");
        }

        Usuario generador = intercambio.getUsuarioGenerador();
        Usuario intercambiador = intercambio.getUsuarioIntercambiador();
        Usuario calificador;
        Usuario calificado;

        if (calificadorId.equals(generador.getId())) {
            // generador is rating intercambiador
            if (intercambio.getPuntajeIntercambiador() != null) {
                throw new IllegalArgumentException("Ya calificaste este intercambio");
            }
            intercambio.setPuntajeIntercambiador(puntaje);
            calificador = generador;
            calificado = intercambiador;

        } else if (calificadorId.equals(intercambiador.getId())) {
            // intercambiador is rating generador
            if (intercambio.getPuntajeGenerador() != null) {
                throw new IllegalArgumentException("Ya calificaste este intercambio");
            }
            intercambio.setPuntajeGenerador(puntaje);
            calificador = intercambiador;
            calificado = generador;

        } else {
            throw new IllegalArgumentException("No sos parte de este intercambio");
        }

        // El puntaje embebido en el Intercambio es el estado "¿ya califiqué este intercambio?"
        // del front; la Calificacion es la que alimenta la reputación (ver calcularReputacion).
        repository.save(intercambio);
        calificacionRepository.save(Calificacion.builder()
                .usuarioCalificador(calificador)
                .usuarioCalificado(calificado)
                .intercambio(intercambio)
                .calificacion(puntaje)
                .build());

        return intercambio;
    }


    public ReputacionResponseDTO calcularReputacion(String usuarioId) {
        List<Calificacion> recibidas = calificacionRepository.findByUsuarioCalificadoId(usuarioId);

        int total = 0;
        double suma = 0;
        int[] counts = new int[6]; // índices 1..5

        for (Calificacion c : recibidas) {
            Integer puntaje = c.getCalificacion();
            if (puntaje != null && puntaje >= 1 && puntaje <= 5) {
                total++;
                suma += puntaje;
                counts[puntaje]++;
            }
        }

        double score = total > 0 ? Math.round((suma / total) * 10.0) / 10.0 : 0.0;

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
