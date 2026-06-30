package com.grupo3.tp.service;

import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.repository.NotificacionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

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
}