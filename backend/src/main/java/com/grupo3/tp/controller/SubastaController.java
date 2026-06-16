package com.grupo3.tp.controller;

import com.grupo3.tp.models.EstadoSubasta;
import com.grupo3.tp.models.Subasta;
import com.grupo3.tp.service.SubastaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/subastas")
public class SubastaController {

    private final SubastaService service;

    public SubastaController(SubastaService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<Subasta>> getAll() {
        return ResponseEntity.ok(service.obtenerTodas());
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<Subasta>> getByUsuario(@PathVariable String usuarioId) {
        return ResponseEntity.ok(service.obtenerPorUsuario(usuarioId));
    }

    @GetMapping("/participando/{usuarioId}")
    public ResponseEntity<List<Subasta>> getParticipando(@PathVariable String usuarioId) {
        return ResponseEntity.ok(service.obtenerParticipando(usuarioId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subasta> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/iniciar")
    public ResponseEntity<Subasta> iniciar(@PathVariable String id) {
        Subasta subasta = service.obtenerPorId(id)
                .orElseThrow(() -> new RuntimeException("Subasta not found"));

        if (subasta.getEstado() != EstadoSubasta.PENDIENTE) {
            throw new RuntimeException("Subasta no está en estado PENDIENTE");
        }

        subasta.setEstado(EstadoSubasta.EN_CURSO);
        subasta.setHoraInicio(LocalDateTime.now());

        // Recalculate horaFin
        if (subasta.getDuracion() != null) {
            subasta.setHoraFin(LocalDateTime.now().plusMinutes(subasta.getDuracion()));
        }

        return ResponseEntity.ok(service.actualizar(id, subasta).orElse(null));
    }

    @PostMapping
    public ResponseEntity<Subasta> create(@RequestBody Subasta subasta) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(subasta));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subasta> update(@PathVariable String id, @RequestBody Subasta subasta) {
        return service.actualizar(id, subasta)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (service.eliminar(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
