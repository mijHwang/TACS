package com.grupo3.tp.configs;

import com.grupo3.tp.service.CatalogoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Carga el catálogo real al arrancar, solo si la base está vacía (idempotente, no destructivo). */
@Component
public class CatalogoSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogoSeeder.class);

    private final CatalogoService catalogoService;

    public CatalogoSeeder(CatalogoService catalogoService) {
        this.catalogoService = catalogoService;
    }

    @Override
    public void run(String... args) {
        if (!catalogoService.catalogoVacio()) {
            log.info("Catálogo ya presente; se omite la carga inicial.");
            return;
        }
        CatalogoService.ResultadoCarga r = catalogoService.cargarDesdeJson();
        log.info("Catálogo cargado: {} selecciones, {} figuritas base.",
                r.selecciones(), r.figuritasBase());
    }
}
