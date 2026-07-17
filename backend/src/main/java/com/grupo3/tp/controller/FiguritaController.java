package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.CatalogoFiltro;
import com.grupo3.tp.dtos.FiguritaRequestDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.PagedResponse;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.SubastaRepository;
import com.grupo3.tp.service.FiguritaBaseService;
import com.grupo3.tp.service.FiguritaPublicadaService;
import com.grupo3.tp.service.FiguritaService;
import com.grupo3.tp.service.SubastaService;
import com.grupo3.tp.service.UsuarioService;
import org.springframework.data.domain.PageRequest;
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
    private final FiguritaBaseService baseService;
    private final UsuarioService usuarioService;
    private final FiguritaPublicadaService publicadaService;
    private final SubastaService subastaService;

    public FiguritaController(FiguritaService service,
                              FiguritaBaseService baseService,
                              UsuarioService usuarioService,
                              FiguritaPublicadaService publicadaService,
                              SubastaService subastaService) {
        this.service = service;
        this.baseService = baseService;
        this.usuarioService = usuarioService;
        this.publicadaService = publicadaService;
        this.subastaService = subastaService;
    }

    @GetMapping()
    public ResponseEntity<PagedResponse<FiguritaResponseDTO>> getAll(
            @RequestParam(required = false) String usuarioId,
            @RequestParam(required = false) String figuritaBaseId,
            @RequestParam(required = false) Integer numero,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String seleccion,
            @RequestParam(required = false) String equipo,
            @RequestParam(required = false) String categoria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        CatalogoFiltro filtro = new CatalogoFiltro(usuarioId, figuritaBaseId, numero, search, seleccion, equipo, categoria);
        PageRequest pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(PagedResponse.from(service.obtenerCatalogoPaginado(filtro, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Figurita> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/usuario/{userId}")
    public ResponseEntity<List<FiguritaResponseDTO>> getByUser(@PathVariable String userId) {
        return ResponseEntity.ok(service.obtenerPorUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Figurita> create(@RequestBody FiguritaRequestDTO figuritaRequestDTO) {

        FiguritaBase base = baseService.obtenerPorId(figuritaRequestDTO.getFiguritaBaseId())
                .orElseThrow(() -> new RuntimeException("No se encontro el figurita Base"));

        Usuario usuario = usuarioService.obtenerPorId(figuritaRequestDTO.getOwnerId())
                .orElseThrow(() -> new RuntimeException("No se encontro el usuario"));

        Figurita figurita = Figurita.builder().
                figuritaBase(base).owner(usuario).
                build();

        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(figurita));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Figurita> update(@PathVariable String id, @RequestBody Figurita figurita) {
        return service.actualizar(id, figurita)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        publicadaService.removeFiguritaFromPublications(id); // clean references en publicaciones
        subastaService.cancelarPorFigurita(id);               // clean references en subastas
        if (service.eliminar(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}