package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.PagedResponse;
import com.grupo3.tp.dtos.SugerenciaResponseDTO;
import com.grupo3.tp.dtos.UsuarioDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.service.FiguritaService;
import com.grupo3.tp.service.SugerenciaService;
import com.grupo3.tp.service.UsuarioService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService service;
    private final FiguritaService figuritaService;
    private final SugerenciaService sugerenciaService;

    public UsuarioController(UsuarioService service, FiguritaService figuritaService, SugerenciaService sugerenciaService) {
        this.service = service;
        this.figuritaService = figuritaService;
        this.sugerenciaService = sugerenciaService;
    }

    @GetMapping
    public ResponseEntity<List<Usuario>> getAll() {
        return ResponseEntity.ok(service.obtenerTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Usuario> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{userName}/figuritas")
    public ResponseEntity<List<FiguritaResponseDTO>> getFiguritasByUsuario(@PathVariable String userName) {
        Usuario usuario = service.loadUserByUsername(userName);
        List<FiguritaResponseDTO> figuritas = figuritaService.obtenerPorUserId(usuario.getId());
        return ResponseEntity.ok(figuritas);
    }

    @GetMapping("/by-username/{userName}")
    public ResponseEntity<Usuario> getByUserName(@PathVariable String userName) {
         Usuario usuario = service.loadUserByUsername(userName);

        List<Figurita> figuritas = figuritaService.obtenerTodasInternaPorUserId(usuario.getId());
        usuario.setFiguritas(figuritas);

        return  ResponseEntity.ok(usuario);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Usuario>> searchByUsername(@RequestParam String search) {
        return ResponseEntity.ok(service.searchByUsername(search));
    }

    @PostMapping
    public ResponseEntity<Usuario> create(@RequestBody UsuarioDTO usuariodto) {
        Usuario usuario = new Usuario(usuariodto.getUsername(),usuariodto.getPassword(),usuariodto.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(usuario));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> update(@PathVariable String id, @RequestBody Usuario usuario) {
        return service.actualizar(id, usuario)
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

    @GetMapping("/{userName}/figuritas/faltantes")
    public ResponseEntity<List<FiguritaBaseDTO>> getFaltantes(@PathVariable String userName) {
        Usuario usuario = service.loadUserByUsername(userName);
        List<FiguritaBaseDTO> faltantes = figuritaService.obtenerFaltantes(usuario.getId());
        return ResponseEntity.ok(faltantes);
    }

    @GetMapping("/{userName}/figuritas/repetidas")
    public ResponseEntity<List<FiguritaResponseDTO>> getRepetidas(@PathVariable String userName) {
        Usuario usuario = service.loadUserByUsername(userName);
        return ResponseEntity.ok(figuritaService.obtenerRepetidas(usuario.getId()));
    }

    @GetMapping("/{userName}/sugerencias")
    public ResponseEntity<PagedResponse<SugerenciaResponseDTO>> getSugerencias(
            @PathVariable String userName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Usuario usuario = service.loadUserByUsername(userName);
        // Orden estable por id asc: todas las sugerencias de un usuario comparten generadaEn
        // (mismo timestamp del job), por lo que la fecha no desempata; el id sí.
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.ASC, "id"));
        return ResponseEntity.ok(PagedResponse.from(sugerenciaService.obtenerPorUsuario(usuario.getId(), pageable)));
    }
}
