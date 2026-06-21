package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.UsuarioDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.service.FiguritaService;
import com.grupo3.tp.service.UsuarioService;
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

    public UsuarioController(UsuarioService service, FiguritaService figuritaService ) {
        this.service = service;
        this.figuritaService = figuritaService;
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
    public ResponseEntity<List<FiguritaResponseDTO>> getFaltantes(@PathVariable String userName) {
        Usuario usuario = service.loadUserByUsername(userName);
        List<FiguritaResponseDTO> faltantes = figuritaService.obtenerFaltantes(usuario.getId());
        return ResponseEntity.ok(faltantes);
    }

    @GetMapping("/{userName}/figuritas/repetidas")
    public ResponseEntity<List<FiguritaResponseDTO>> getRepetidas(@PathVariable String userName) {
        Usuario usuario = service.loadUserByUsername(userName);
        return ResponseEntity.ok(figuritaService.obtenerRepetidas(usuario.getId()));
    }
}
