package com.grupo3.tp.controller;

import com.grupo3.tp.service.SugerenciaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sugerencias")
public class SugerenciaController {

    private final SugerenciaService sugerenciaService;

    public SugerenciaController(SugerenciaService sugerenciaService) {
        this.sugerenciaService = sugerenciaService;
    }

    /** Dispara la regeneración manual (para testing/demo, sin esperar al job diario). */
    @PostMapping("/regenerar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> regenerar() {
        sugerenciaService.regenerarTodas();
        return ResponseEntity.noContent().build();
    }
}
