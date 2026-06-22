package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.FiguritaBaseRequestDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/figuritas-base")
public class FiguritaBaseController {

    private final FiguritaBaseService service;
    private final SeleccionService seleccionService;
    private final JugadorService jugadorService;
    private final CategoriaFiguritaService  categoriaService;
    private final EquipoService equipoService;

    public FiguritaBaseController(FiguritaBaseService service,
                                  SeleccionService seleccionService,
                                  JugadorService jugadorService,
                                  CategoriaFiguritaService categoriaService,
                                  EquipoService equipoService) {
        this.service = service;
        this.seleccionService = seleccionService;
        this.jugadorService = jugadorService;
        this.categoriaService = categoriaService;
        this.equipoService = equipoService;
    }

    @GetMapping
    public ResponseEntity<List<FiguritaBase>> getAll() {
        return ResponseEntity.ok(service.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FiguritaBase> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<FiguritaBase> create(@RequestBody FiguritaBaseRequestDTO request) {


        Seleccion seleccion = seleccionService.obtenerPorId(request.getSeleccionId())
                .orElseThrow(() -> new RuntimeException("Seleccion no encontrada"));

        Equipo equipo = equipoService.obtenerPorId(request.getEquipoId())
                .orElseThrow(() -> new RuntimeException("Equipo no encontrado"));

        CategoriaFigurita categoria = categoriaService.obtenerPorId(request.getCategoriaId())
                .orElseThrow(() -> new RuntimeException("Categoria no encontrada"));

        Jugador jugador = jugadorService.obtenerPorId(request.getJugadorId())
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        FiguritaBase figuritaBase = FiguritaBase.builder()
                .numero(request.getNumero())
                .seleccion(seleccion)
                .equipo(equipo)
                .categoria(categoria)
                .jugador(jugador)
                .build();


        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(figuritaBase));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FiguritaBase> update(@PathVariable String id, @RequestBody FiguritaBase figuritaBase) {
        return service.actualizar(id, figuritaBase)
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
