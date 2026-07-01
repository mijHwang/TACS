package com.grupo3.tp.service;

import com.grupo3.tp.dtos.DemoSeedResultDTO;
import com.grupo3.tp.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Auto-seed idempotente al arrancar: si la base está vacía, siembra la cohorte de demo
 * (catálogo de figuritas incluido). Se activa solo con demo.seed-on-startup=true
 * (env SEED_ON_STARTUP); apagado en prod y en tests. Nunca wipea data existente.
 */
@Component
@ConditionalOnProperty(name = "demo.seed-on-startup", havingValue = "true")
public class DemoSeedBootstrap {

    private static final Logger log = LoggerFactory.getLogger(DemoSeedBootstrap.class);

    private final UsuarioRepository usuarioRepo;
    private final DemoSeedService demoSeedService;

    public DemoSeedBootstrap(UsuarioRepository usuarioRepo, DemoSeedService demoSeedService) {
        this.usuarioRepo = usuarioRepo;
        this.demoSeedService = demoSeedService;
    }

    /** Se dispara cuando la app está lista (Mongo ya conectado). */
    @EventListener(ApplicationReadyEvent.class)
    public void alArrancar() {
        seedSiVacio();
    }

    /** Siembra solo si no hay usuarios (idempotente). @return true si sembró. */
    boolean seedSiVacio() {
        long usuarios = usuarioRepo.count();
        if (usuarios > 0) {
            log.info("Auto-seed omitido: la base ya tiene {} usuario(s).", usuarios);
            return false;
        }
        log.info("Auto-seed: base vacía, sembrando cohorte de demo...");
        DemoSeedResultDTO r = demoSeedService.seed();
        log.info("Auto-seed completo: {} usuarios, {} figuritas, {} publicaciones, {} subastas.",
                r.getUsuarios(), r.getFiguritas(), r.getFiguritasPublicadas(), r.getSubastas());
        return true;
    }
}
