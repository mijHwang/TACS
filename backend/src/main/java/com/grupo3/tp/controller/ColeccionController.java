package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.FaltanteRequestDTO;
import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.dtos.PagedResponse;
import com.grupo3.tp.dtos.SetCantidadRequestDTO;
import com.grupo3.tp.service.ColeccionService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/usuarios")
public class ColeccionController {

    private final ColeccionService coleccionService;

    public ColeccionController(ColeccionService coleccionService) {
        this.coleccionService = coleccionService;
    }

    /** El caller autenticado debe ser {@code username} o admin. */
    private void assertSelfOrAdmin(String username) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !auth.getName().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No podés modificar la colección de otro usuario");
        }
    }

    @PutMapping("/{username}/figuritas/{figuritaBaseId}")
    public ResponseEntity<FiguritaResponseDTO> setCantidad(
            @PathVariable String username,
            @PathVariable String figuritaBaseId,
            @RequestBody SetCantidadRequestDTO body) {
        assertSelfOrAdmin(username);
        if (body == null || body.getCantidad() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta 'cantidad'");
        }
        return ResponseEntity.ok(coleccionService.setCantidad(username, figuritaBaseId, body.getCantidad()));
    }

    /** Wishlist declarada del usuario (reemplaza el faltante derivado). */
    @GetMapping("/{username}/figuritas/faltantes")
    public ResponseEntity<PagedResponse<FiguritaBaseDTO>> getFaltantes(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 2000));
        return ResponseEntity.ok(PagedResponse.from(coleccionService.listarFaltantes(username, pageable)));
    }

    @PostMapping("/{username}/faltantes")
    public ResponseEntity<Void> agregarFaltante(
            @PathVariable String username,
            @RequestBody FaltanteRequestDTO body) {
        assertSelfOrAdmin(username);
        if (body == null || body.getFiguritaBaseId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta 'figuritaBaseId'");
        }
        coleccionService.agregarFaltante(username, body.getFiguritaBaseId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{username}/faltantes/{figuritaBaseId}")
    public ResponseEntity<Void> quitarFaltante(
            @PathVariable String username,
            @PathVariable String figuritaBaseId) {
        assertSelfOrAdmin(username);
        coleccionService.quitarFaltante(username, figuritaBaseId);
        return ResponseEntity.noContent().build();
    }
}
