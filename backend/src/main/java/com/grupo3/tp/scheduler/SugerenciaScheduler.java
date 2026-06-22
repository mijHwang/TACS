package com.grupo3.tp.scheduler;

import com.grupo3.tp.service.SugerenciaService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Dispara la regeneración de sugerencias una vez al día. Por defecto a las 3 AM
 * (hora Argentina); ambos valores son configurables por property.
 */
@Component
public class SugerenciaScheduler {

    private final SugerenciaService sugerenciaService;

    public SugerenciaScheduler(SugerenciaService sugerenciaService) {
        this.sugerenciaService = sugerenciaService;
    }

    @Scheduled(cron = "${sugerencias.cron:0 0 3 * * *}", zone = "${sugerencias.zone:America/Argentina/Buenos_Aires}")
    public void regenerarDiariamente() {
        sugerenciaService.regenerarTodas();
    }
}
