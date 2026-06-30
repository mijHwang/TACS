package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.IntercambioResponseDTO;
import com.grupo3.tp.dtos.PagedResponse;
import com.grupo3.tp.dtos.ReputacionResponseDTO;
import com.grupo3.tp.models.Intercambio;
import com.grupo3.tp.service.IntercambioService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/intercambios")
public class IntercambioController {

    private final IntercambioService service;

    public IntercambioController(IntercambioService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<IntercambioResponseDTO>> getAll() {
        return ResponseEntity.ok(service.obtenerTodos().stream()
                .map(service::mapToDTO)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<IntercambioResponseDTO> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(service::mapToDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<IntercambioResponseDTO> create(@RequestBody Intercambio intercambio) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.mapToDTO(service.crear(intercambio)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IntercambioResponseDTO> update(@PathVariable String id, @RequestBody Intercambio intercambio) {
        return service.actualizar(id, intercambio)
                .map(service::mapToDTO)
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

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<PagedResponse<IntercambioResponseDTO>> getByUsuario(
            @PathVariable String usuarioId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(Sort.Direction.DESC, "fecha"));
        return ResponseEntity.ok(PagedResponse.from(
                service.obtenerPorUsuarioId(usuarioId, pageable)));
    }

    @PatchMapping("/{id}/calificar")
    public ResponseEntity<IntercambioResponseDTO> calificar(
            @PathVariable String id,
            @RequestParam String calificadorId,
            @RequestParam Integer puntaje) {
        try {
            return ResponseEntity.ok(service.mapToDTO(service.calificar(id, calificadorId, puntaje)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/usuario/{usuarioId}/reputacion")
    public ResponseEntity<ReputacionResponseDTO> getReputacion(@PathVariable String usuarioId) {
        return ResponseEntity.ok(service.calcularReputacion(usuarioId));
    }
}