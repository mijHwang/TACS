package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.FiguritaRequestDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.SubastaRepository;
import com.grupo3.tp.service.FiguritaBaseService;
import com.grupo3.tp.service.FiguritaService;
import com.grupo3.tp.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/figuritas")
public class FiguritaController {

    private final FiguritaService service;
    private final FiguritaBaseService  baseService;
    private final UsuarioService usuarioService;

    public FiguritaController(FiguritaService service, FiguritaBaseService baseService, UsuarioService usuarioService) {
        this.service = service;
        this.baseService = baseService;
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<Figurita>> getAll() {
        return ResponseEntity.ok(service.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Figurita> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


    @PostMapping
    public ResponseEntity<Figurita> create(@RequestBody FiguritaRequestDTO figuritaRequestDTO) {

        //check they exist
        FiguritaBase base = baseService.obtenerPorId(figuritaRequestDTO.getFiguritaBaseId())
                .orElseThrow(() -> new RuntimeException("No se encontro el figurita Base"));

        Usuario usuario = usuarioService.obtenerPorId(figuritaRequestDTO.getOwnerId())
                .orElseThrow(() -> new RuntimeException("No se encontro el usuario"));

        Figurita figurita = Figurita.builder().
                figuritaBase(base).owner(usuario).
                build();

        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(figurita));
    }

    //I am beginning to wonder why would I use this.
    @PutMapping("/{id}")
    public ResponseEntity<Figurita> update(@PathVariable String id, @RequestBody Figurita figurita) {
        return service.actualizar(id, figurita)
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
