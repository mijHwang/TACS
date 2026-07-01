// backend/src/main/java/com/grupo3/tp/service/DemoTimeline.java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Intercambio;
import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.models.Oferta;
import com.grupo3.tp.repository.IntercambioRepository;
import com.grupo3.tp.repository.NotificacionRepository;
import com.grupo3.tp.repository.OfertaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * Reloj simulado del seed de demo: genera fechas relativas al día de recarga y
 * backdatea los efectos colaterales (notificaciones, intercambios, ofertas) que los
 * services de dominio crean con {@code now()} durante un evento. Código de demo.
 */
class DemoTimeline {

    private final NotificacionRepository notificacionRepo;
    private final IntercambioRepository intercambioRepo;
    private final OfertaRepository ofertaRepo;

    DemoTimeline(NotificacionRepository notificacionRepo,
                 IntercambioRepository intercambioRepo,
                 OfertaRepository ofertaRepo) {
        this.notificacionRepo = notificacionRepo;
        this.intercambioRepo = intercambioRepo;
        this.ofertaRepo = ofertaRepo;
    }

    /** Hoy (00:00) + offsetDias, a la hora dada. offset negativo = pasado. */
    LocalDateTime dia(int offsetDias, int hora) {
        return LocalDate.now().atStartOfDay().plusDays(offsetDias).plusHours(hora);
    }

    /**
     * Corre {@code accion} y backdatea a {@code cuando} las notificaciones/intercambios/ofertas
     * creados durante ella (detectados por diferencia de ids antes/después).
     */
    void enDia(LocalDateTime cuando, Runnable accion) {
        Set<String> notifAntes = ids(notificacionRepo.findAll(), Notificacion::getId);
        Set<String> interAntes = ids(intercambioRepo.findAll(), Intercambio::getId);
        Set<String> ofertaAntes = ids(ofertaRepo.findAll(), Oferta::getId);

        accion.run();

        for (Notificacion n : notificacionRepo.findAll()) {
            if (!notifAntes.contains(n.getId())) { n.setFecha(cuando); notificacionRepo.save(n); }
        }
        for (Intercambio it : intercambioRepo.findAll()) {
            if (!interAntes.contains(it.getId())) { it.setFecha(cuando); intercambioRepo.save(it); }
        }
        for (Oferta o : ofertaRepo.findAll()) {
            if (!ofertaAntes.contains(o.getId())) { o.setFechaOferta(cuando); ofertaRepo.save(o); }
        }
    }

    private <T> Set<String> ids(List<T> list, Function<T, String> getId) {
        Set<String> s = new HashSet<>();
        for (T t : list) s.add(getId.apply(t));
        return s;
    }
}
