package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.OfertaDTO;
import com.grupo3.tp.dtos.SubastaDTO;
import com.grupo3.tp.models.Oferta;
import com.grupo3.tp.service.OfertaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ofertas")
public class OfertaController {

    private final OfertaService service;

    public OfertaController(OfertaService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<Oferta>> getAll() {
        return ResponseEntity.ok(service.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Oferta> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/subasta/{subastaId}")
    public ResponseEntity<Oferta> create(
            @PathVariable String subastaId,
            @RequestBody OfertaDTO ofertaDTO) {

        SubastaDTO subastaDTO = new SubastaDTO();
        subastaDTO.setSubastaId(subastaId);

        Oferta oferta = service.crear(ofertaDTO, subastaDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(oferta);
    }




    @PutMapping("/{id}")
    public ResponseEntity<Oferta> update(@PathVariable String id, @RequestBody Oferta oferta) {
        return service.actualizar(id, oferta)
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
