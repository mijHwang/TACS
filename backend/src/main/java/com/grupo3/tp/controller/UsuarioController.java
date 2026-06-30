package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.CatalogoFiltro;
import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.PagedResponse;
import com.grupo3.tp.dtos.SugerenciaResponseDTO;
import com.grupo3.tp.dtos.UsuarioDTO;
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

    /**
     * Colección del usuario, paginada y agrupada por figurita-base. Filtros server-side.
     * Admite {@code size} grande (hasta 2000) para que "Nueva propuesta" cargue la colección completa.
     */
    @GetMapping("/{userName}/figuritas")
    public ResponseEntity<PagedResponse<FiguritaResponseDTO>> getFiguritasByUsuario(
            @PathVariable String userName,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String seleccion,
            @RequestParam(required = false) String equipo,
            @RequestParam(required = false) String categoria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Usuario usuario = service.loadUserByUsername(userName);
        CatalogoFiltro filtro = new CatalogoFiltro(usuario.getId(), null, null, search, seleccion, equipo, categoria);
        PageRequest pageable = PageRequest.of(page, Math.min(size, 2000));
        return ResponseEntity.ok(PagedResponse.from(figuritaService.obtenerPorUserIdPaginado(filtro, pageable)));
    }

    @GetMapping("/by-username/{userName}")
    public ResponseEntity<Usuario> getByUserName(@PathVariable String userName) {
        // Solo carga el usuario; figuritas/subastasFavoritas van @JsonIgnore (ver Usuario).
        Usuario usuario = service.loadUserByUsername(userName);
        return ResponseEntity.ok(usuario);
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

    /** Faltantes del usuario (bases que no tiene), paginadas y filtradas server-side. */
    @GetMapping("/{userName}/figuritas/faltantes")
    public ResponseEntity<PagedResponse<FiguritaBaseDTO>> getFaltantes(
            @PathVariable String userName,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String seleccion,
            @RequestParam(required = false) String equipo,
            @RequestParam(required = false) String categoria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Usuario usuario = service.loadUserByUsername(userName);
        CatalogoFiltro filtro = new CatalogoFiltro(usuario.getId(), null, null, search, seleccion, equipo, categoria);
        // Tope 2000 (como /figuritas) para que el dashboard pueda traer el álbum completo y contar exacto.
        PageRequest pageable = PageRequest.of(page, Math.min(size, 2000));
        return ResponseEntity.ok(PagedResponse.from(figuritaService.obtenerFaltantesPaginado(filtro, pageable)));
    }

    /** Repetidas del usuario (count &gt; 1), paginadas y filtradas server-side. */
    @GetMapping("/{userName}/figuritas/repetidas")
    public ResponseEntity<PagedResponse<FiguritaResponseDTO>> getRepetidas(
            @PathVariable String userName,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String seleccion,
            @RequestParam(required = false) String equipo,
            @RequestParam(required = false) String categoria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Usuario usuario = service.loadUserByUsername(userName);
        CatalogoFiltro filtro = new CatalogoFiltro(usuario.getId(), null, null, search, seleccion, equipo, categoria);
        // Tope 2000: las pantallas de subasta (publicar/ofertar) cargan todas las repetidas para elegir.
        PageRequest pageable = PageRequest.of(page, Math.min(size, 2000));
        return ResponseEntity.ok(PagedResponse.from(figuritaService.obtenerRepetidasPaginado(filtro, pageable)));
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
