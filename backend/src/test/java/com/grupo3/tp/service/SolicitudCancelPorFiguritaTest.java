package com.grupo3.tp.service;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SolicitudCancelPorFiguritaTest {

    @Mock private SolicitudDeIntercambioRepository repository;
    @Mock private NotificacionService notificacionService;
    @Mock private FiguritaService figuritaService;
    @Mock private IntercambioService intercambioService;
    @Mock private FiguritaPublicadaService publicadaService;

    private SolicitudDeIntercambioService service;

    private Usuario proponente;
    private Usuario duenio;

    @BeforeEach
    public void setUp() {
        service = new SolicitudDeIntercambioService(repository, notificacionService, figuritaService, intercambioService, publicadaService);
        proponente = Usuario.builder().id("user-prop").username("proponente").build();
        duenio = Usuario.builder().id("user-owner").username("duenio").build();
    }

    @Test
    public void cancelaSolicitudDondeLaFiguritaEsLaPedidaYAvisaAlProponente() {
        Figurita pedida = Figurita.builder().id("fig-1").owner(duenio).build();
        SolicitudDeIntercambio sol = SolicitudDeIntercambio.builder()
                .id("sol-1").usuario(proponente).figurita(pedida)
                .figuritasOfrecidas(List.of())
                .estado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE).build();
        when(repository.findPendientesByFiguritaId("fig-1")).thenReturn(List.of(sol));

        service.cancelarPorFigurita("fig-1");

        assertEquals(SolicitudDeIntercambio.EstadoSolicitud.CANCELADO, sol.getEstado());
        verify(repository).save(sol);
        verify(notificacionService).crear(argThat(n -> n.getUsuario() == proponente));
    }

    @Test
    public void cancelaSolicitudDondeLaFiguritaEsOfrecidaYAvisaAlDuenio() {
        Figurita pedida = Figurita.builder().id("fig-pedida").owner(duenio).build();
        Figurita ofrecida = Figurita.builder().id("fig-2").owner(proponente).build();
        SolicitudDeIntercambio sol = SolicitudDeIntercambio.builder()
                .id("sol-2").usuario(proponente).figurita(pedida)
                .figuritasOfrecidas(List.of(ofrecida))
                .estado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE).build();
        when(repository.findPendientesByFiguritaId("fig-2")).thenReturn(List.of(sol));

        service.cancelarPorFigurita("fig-2");

        assertEquals(SolicitudDeIntercambio.EstadoSolicitud.CANCELADO, sol.getEstado());
        verify(notificacionService).crear(argThat(n -> n.getUsuario() == duenio));
    }
}
