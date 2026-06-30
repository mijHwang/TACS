package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.DemoSeedResultDTO;
import com.grupo3.tp.dtos.PlatformStatsDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.service.AdminStatsService;
import com.grupo3.tp.service.DemoSeedService;
import com.grupo3.tp.service.FiguritaBaseService;
import com.grupo3.tp.service.FiguritaService;
import com.grupo3.tp.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminStatsService adminStatsService;
    private final FiguritaService figuritaService;
    private final UsuarioService usuarioService;
    private final FiguritaBaseService figuritaBaseService;
    private final DemoSeedService demoSeedService;

    public AdminController(AdminStatsService adminStatsService,
                           FiguritaService figuritaService,
                           UsuarioService usuarioService,
                           FiguritaBaseService figuritaBaseService,
                           DemoSeedService demoSeedService) {
        this.adminStatsService = adminStatsService;
        this.figuritaService = figuritaService;
        this.usuarioService = usuarioService;
        this.figuritaBaseService = figuritaBaseService;
        this.demoSeedService = demoSeedService;
    }

    @GetMapping("/stats")
    public ResponseEntity<PlatformStatsDTO> getStats() {
        return ResponseEntity.ok(adminStatsService.getStats());
    }

    /** Resetea toda la base y carga la cohorte de datos de demo. Acción destructiva, admin-only. */
    @PostMapping("/seed-demo")
    public ResponseEntity<DemoSeedResultDTO> seedDemo() {
        return ResponseEntity.ok(demoSeedService.seed());
    }

    @PostMapping("/users/{userId}/gift-figurita/{baseId}")
    public ResponseEntity<Figurita> giftFigurita(@PathVariable String userId, @PathVariable String baseId) {
        Usuario usuario = usuarioService.obtenerPorId(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        FiguritaBase base = figuritaBaseService.obtenerPorId(baseId)
                .orElseThrow(() -> new RuntimeException("FiguritaBase no encontrado"));

        Figurita figurita = Figurita.builder()
                .figuritaBase(base)
                .owner(usuario)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(figuritaService.crear(figurita));
    }
}
