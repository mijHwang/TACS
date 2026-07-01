package com.grupo3.tp.service;

import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.NotificacionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class NotificacionService {

    private final NotificacionRepository repository;

    public NotificacionService(NotificacionRepository repository) {
        this.repository = repository;
    }

    public Notificacion crear(Notificacion notificacion) {
        return repository.save(notificacion);
    }

    public Optional<Notificacion> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public List<Notificacion> obtenerTodas() {
        return repository.findAll();
    }

    public List<Notificacion> obtenerPorUsuario(String usuarioId) {
        return repository.findByUsuarioId(usuarioId);
    }

    public Page<Notificacion> obtenerPorUsuario(String usuarioId, Pageable pageable) {
        return repository.findByUsuarioId(usuarioId, pageable);
    }

    public Optional<Notificacion> marcarComoLeida(String id) {
        Optional<Notificacion> notificacion = repository.findById(id);
        if (notificacion.isPresent()) {
            notificacion.get().setLeida(true);
            repository.save(notificacion.get());
        }
        return notificacion;
    }

    public boolean eliminar(String id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    /**
     * Notifica (en background) a los usuarios a los que les falta la figurita
     * base recién subastada. El creador de la subasta se excluye por las dudas
     * (ya queda fuera del set de "interesados", porque es dueño de la figurita).
     */
    @Async
    public void notificarUsuariosFaltantesSubasta(List<Usuario> interesados, String jugadorNombre, String creadorId, String subastaId) {
        List<Notificacion> nuevasNotificaciones = interesados.stream()
                .filter(u -> !u.getId().equals(creadorId))
                .map(u -> Notificacion.builder()
                        .usuario(u)
                        .tipo("subasta")
                        .titulo("Subasta de figurita faltante")
                        .mensaje("¡Se inició una subasta de una figurita que te falta! (" + jugadorNombre + ")")
                        .enlace("/subastas/" + subastaId)
                        .leida(false)
                        .fecha(LocalDateTime.now())
                        .build())
                .toList();

        if (!nuevasNotificaciones.isEmpty()) {
            repository.saveAll(nuevasNotificaciones); // un solo hit a la DB para todos
        }
    }

    /**
     * Notifica (en background) a los usuarios a los que les falta la figurita
     * base recién publicada para intercambio.
     */
    @Async
    public void notificarUsuariosFaltantes(List<Usuario> interesados, String jugadorNombre, String publicadorId) {
        List<Notificacion> nuevasNotificaciones = interesados.stream()
                .filter(u -> !u.getId().equals(publicadorId))
                .map(u -> Notificacion.builder()
                        .usuario(u)
                        .tipo("publicacion")
                        .titulo("Figurita faltante publicada")
                        .mensaje("Se publicó una figurita que te falta: " + jugadorNombre)
                        .enlace("/intercambios")
                        .leida(false)
                        .fecha(LocalDateTime.now())
                        .build())
                .toList();

        if (!nuevasNotificaciones.isEmpty()) {
            repository.saveAll(nuevasNotificaciones);
        }
    }
}