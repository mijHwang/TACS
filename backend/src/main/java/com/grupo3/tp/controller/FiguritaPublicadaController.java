package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.FiguritaPublicadaRequestDTO;
import com.grupo3.tp.dtos.FiguritaPublicadaResponseDTO;
import com.grupo3.tp.service.FiguritaPublicadaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/publicaciones")
public class FiguritaPublicadaController {

    private final FiguritaPublicadaService service;

    public FiguritaPublicadaController(FiguritaPublicadaService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<FiguritaPublicadaResponseDTO> publicar(
            @RequestBody FiguritaPublicadaRequestDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(service.publicar(dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/disponibles/{usuarioId}")
    public ResponseEntity<List<FiguritaPublicadaResponseDTO>> getDisponibles(
            @PathVariable String usuarioId) {
        return ResponseEntity.ok(service.obtenerDisponibles(usuarioId));
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<FiguritaPublicadaResponseDTO>> getByUsuario(
            @PathVariable String usuarioId) {
        return ResponseEntity.ok(service.obtenerPorUsuario(usuarioId));
    }

    @PatchMapping("/{id}/retirar")
    public ResponseEntity<FiguritaPublicadaResponseDTO> retirar(@PathVariable String id) {
        return ResponseEntity.ok(service.retirar(id));
    }
}