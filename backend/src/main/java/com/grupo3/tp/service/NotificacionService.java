package com.grupo3.tp.service;

import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.NotificacionRepository;
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

    @Async
    public void notificarUsuariosFaltantesSubasta(List<Usuario> interesados, String jugadorNombre, String creadorId, String subastaId) {
        List<Notificacion> nuevasNotificaciones = interesados.stream()
                .filter(u -> !u.getId().equals(creadorId)) // Don't notify the creator
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
            repository.saveAll(nuevasNotificaciones); // One database hit for all users
        }
    }

    @Async
    public void notificarUsuariosFaltantes(List<Usuario> interesados, String jugadorNombre, String publicadorId) {
        for (Usuario u : interesados) {
            if (!u.getId().equals(publicadorId)) {
                Notificacion notif = Notificacion.builder()
                        .usuario(u)
                        .tipo("publicacion")
                        .mensaje("Se publicó una figurita que te falta: " + jugadorNombre)
                        .leida(false)
                        .fecha(LocalDateTime.now())
                        .build();
                this.crear(notif); // saves to DB
            }
        }
    }
}