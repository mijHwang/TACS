package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.SolicitudDeIntercambioDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.SolicitudDeIntercambio;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.service.FiguritaService;
import com.grupo3.tp.service.SolicitudDeIntercambioService;
import com.grupo3.tp.service.UsuarioService;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DocumentReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.swing.text.html.parser.Entity;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/solicitudes-intercambio")
public class SolicitudDeIntercambioController {

    private final SolicitudDeIntercambioService service;
    private final UsuarioService usuarioService;
    private final FiguritaService figuritaService;

    public SolicitudDeIntercambioController(SolicitudDeIntercambioService service,
                                            UsuarioService usuarioService,
                                            FiguritaService figuritaService) {
        this.service = service;
        this.usuarioService = usuarioService;
        this.figuritaService = figuritaService;
    }

    @GetMapping
    public ResponseEntity<List<SolicitudDeIntercambio>> getAll() {
        return ResponseEntity.ok(service.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SolicitudDeIntercambio> getById(@PathVariable String id) {
        return service.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<SolicitudDeIntercambio> create(@RequestBody SolicitudDeIntercambioDTO request) {


        Usuario usuarioAux = usuarioService.obtenerPorId(request.getUsuarioId())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Figurita figurita = figuritaService.obtenerPorId(request.getFiguritaId())
                .orElseThrow(() -> new RuntimeException("Figurita no encontrada"));

        List<Figurita> figuritasOfrecidas = new ArrayList<>();

        for (String id : request.getFiguritasOfrecidas()) {
            Figurita figuritaAux = figuritaService.obtenerPorId(id)
                    .orElseThrow(() -> new RuntimeException("Figurita no encontrada"));
            figuritasOfrecidas.add(figuritaAux);
        }


        SolicitudDeIntercambio solicitud = SolicitudDeIntercambio.builder()
                .usuario(usuarioAux)
                .figurita(figurita)
                .figuritasOfrecidas(figuritasOfrecidas)
                .estado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE)
                .destinatarioUsername(figurita.getOwner().getUsername())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(solicitud));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SolicitudDeIntercambio> update(@PathVariable String id, @RequestBody SolicitudDeIntercambio solicitud) {
        return service.actualizar(id, solicitud)
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

    @GetMapping("/recibidas/{usuarioId}")
    public ResponseEntity<List<SolicitudDeIntercambio>> getRecibidas(@PathVariable String usuarioId) {
        return ResponseEntity.ok(service.obtenerRecibidas(usuarioId));
    }

    @GetMapping("/enviadas/{usuarioId}")
    public ResponseEntity<List<SolicitudDeIntercambio>> getEnviadas(@PathVariable String usuarioId) {
        return ResponseEntity.ok(service.obtenerEnviadas(usuarioId));


    }

    @PutMapping("/{id}/aceptar")
    public ResponseEntity<SolicitudDeIntercambio> aceptar(@PathVariable String id) {
        return service.aceptar(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<SolicitudDeIntercambio> rechazar(@PathVariable String id) {
        return service.rechazar(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

}
