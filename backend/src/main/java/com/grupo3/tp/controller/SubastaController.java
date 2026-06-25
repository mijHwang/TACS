package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.SubastaDTO;
import com.grupo3.tp.dtos.SubastaResponseDTO;
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

    // FIXED: Changed return type from List<Subasta> to List<SubastaResponseDTO>
    // Maps each Subasta to DTO with flattened figurita data
    @GetMapping
    public ResponseEntity<List<SubastaResponseDTO>> getAll() {
        return ResponseEntity.ok(service.obtenerTodas().stream()
                .map(service::mapToDTO)
                .toList());
    }

    // FIXED: Changed return type to SubastaResponseDTO and added mapping
    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<SubastaResponseDTO>> getByUsuario(@PathVariable String usuarioId) {
        return ResponseEntity.ok(service.obtenerPorUsuario(usuarioId).stream()
                .map(service::mapToDTO)
                .toList());
    }

    // FIXED: Changed return type to SubastaResponseDTO and added mapping
    @GetMapping("/participando/{usuarioId}")
    public ResponseEntity<List<SubastaResponseDTO>> getParticipando(@PathVariable String usuarioId) {
        return ResponseEntity.ok(service.obtenerParticipando(usuarioId).stream()
                .map(service::mapToDTO)
                .toList());
    }

    // FIXED: Changed return type to SubastaResponseDTO and added mapping
    @GetMapping("/{id}")
    public ResponseEntity<SubastaResponseDTO> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(s -> ResponseEntity.ok(service.mapToDTO(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    // FIXED: Fixed horaFin calculation bug
    // Was: LocalDateTime.now().plusMinutes() — recalculates from NOW
    // Now: Uses original horaInicio + duracion to preserve intended end time
    @PutMapping("/{id}/iniciar")
    public ResponseEntity<SubastaResponseDTO> iniciar(@PathVariable String id) {
        Subasta subasta = service.obtenerPorId(id)
                .orElseThrow(() -> new RuntimeException("Subasta not found"));

        if (subasta.getEstado() != EstadoSubasta.PENDIENTE) {
            throw new RuntimeException("Subasta no está en estado PENDIENTE");
        }

        subasta.setEstado(EstadoSubasta.EN_CURSO);
        subasta.setHoraInicio(LocalDateTime.now());

        // FIXED: Use horaInicio + duracion, not now + duracion
        if (subasta.getDuracion() != null) {
            subasta.setHoraFin(subasta.getHoraInicio().plusMinutes(subasta.getDuracion()));
        }

        return service.actualizar(id, subasta)
                .map(s -> ResponseEntity.ok(service.mapToDTO(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    // FIXED: Changed return type to SubastaResponseDTO
    // Now returns full DTO instead of raw Subasta
    @PostMapping
    public ResponseEntity<SubastaResponseDTO> create(@RequestBody SubastaDTO subasta) {
        Subasta created = service.crear(subasta);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.mapToDTO(created));
    }

    // FIXED: Changed return type to SubastaResponseDTO and added mapping
    @PutMapping("/{id}")
    public ResponseEntity<SubastaResponseDTO> update(@PathVariable String id, @RequestBody Subasta subasta) {
        return service.actualizar(id, subasta)
                .map(s -> ResponseEntity.ok(service.mapToDTO(s)))
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