// backend/src/test/java/com/grupo3/tp/service/DemoTimelineTest.java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Intercambio;
import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.models.Oferta;
import com.grupo3.tp.repository.IntercambioRepository;
import com.grupo3.tp.repository.NotificacionRepository;
import com.grupo3.tp.repository.OfertaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DemoTimelineTest {

    @Mock NotificacionRepository notificacionRepo;
    @Mock IntercambioRepository intercambioRepo;
    @Mock OfertaRepository ofertaRepo;

    @Test
    void diaGeneraFechasRelativasAHoy() {
        DemoTimeline t = new DemoTimeline(notificacionRepo, intercambioRepo, ofertaRepo);
        LocalDateTime hoy9 = t.dia(0, 9);
        LocalDateTime haceSeis = t.dia(-6, 9);
        assertEquals(9, hoy9.getHour());
        assertEquals(0, hoy9.getMinute());
        assertEquals(hoy9.minusDays(6), haceSeis);
        assertTrue(haceSeis.isBefore(hoy9));
    }

    @Test
    void enDiaBackdateaSoloLasNotificacionesNuevas() {
        Notificacion n0 = Notificacion.builder().id("n0").build();
        Notificacion n1 = Notificacion.builder().id("n1").build();
        LocalDateTime cuando = LocalDateTime.of(2020, 1, 1, 10, 0);
        when(notificacionRepo.findAll()).thenReturn(List.of(n0), List.of(n0, n1));
        when(intercambioRepo.findAll()).thenReturn(List.of());
        when(ofertaRepo.findAll()).thenReturn(List.of());

        DemoTimeline t = new DemoTimeline(notificacionRepo, intercambioRepo, ofertaRepo);
        t.enDia(cuando, () -> { /* la acción "crea" n1 (simulado por el mock) */ });

        assertEquals(cuando, n1.getFecha());
        assertNull(n0.getFecha());
        verify(notificacionRepo).save(n1);
        verify(notificacionRepo, never()).save(n0);
    }

    @Test
    void enDiaBackdateaIntercambioYOfertaNuevos() {
        Intercambio it0 = Intercambio.builder().id("it0").build();
        Intercambio it1 = Intercambio.builder().id("it1").build();
        Oferta o0 = Oferta.builder().id("o0").build();
        Oferta o1 = Oferta.builder().id("o1").build();
        LocalDateTime cuando = LocalDateTime.of(2020, 2, 2, 12, 0);
        when(notificacionRepo.findAll()).thenReturn(List.of());
        when(intercambioRepo.findAll()).thenReturn(List.of(it0), List.of(it0, it1));
        when(ofertaRepo.findAll()).thenReturn(List.of(o0), List.of(o0, o1));

        DemoTimeline t = new DemoTimeline(notificacionRepo, intercambioRepo, ofertaRepo);
        t.enDia(cuando, () -> {});

        assertEquals(cuando, it1.getFecha());
        assertNull(it0.getFecha());
        verify(intercambioRepo).save(it1);
        verify(intercambioRepo, never()).save(it0);
        assertEquals(cuando, o1.getFechaOferta());
        assertNull(o0.getFechaOferta());
        verify(ofertaRepo).save(o1);
        verify(ofertaRepo, never()).save(o0);
    }
}
