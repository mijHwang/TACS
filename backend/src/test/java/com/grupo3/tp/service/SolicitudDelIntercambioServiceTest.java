package com.grupo3.tp.service;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SolicitudDelIntercambioServiceTest {

    @Mock private SolicitudDeIntercambioRepository repository;
    @Mock private NotificacionService notificacionService;
    @Mock private FiguritaService figuritaService;
    @Mock private IntercambioService intercambioService;
    @Mock private FiguritaPublicadaService publicadaService; // NUEVA DEPENDENCIA

    @InjectMocks private SolicitudDeIntercambioService service;

    private SolicitudDeIntercambio solicitud;
    private Usuario owner;
    private Usuario petitioner;
    private Figurita figOwner;
    private Figurita figPetitioner;

    @BeforeEach
    public void setUp() {
        owner = Usuario.builder().id("user-1").username("owner").build();
        petitioner = Usuario.builder().id("user-2").username("petitioner").build();

        figOwner = Figurita.builder().id("fig-1").owner(owner).build();
        figPetitioner = Figurita.builder().id("fig-2").owner(petitioner).build();

        solicitud = SolicitudDeIntercambio.builder()
                .id("sol-1")
                .usuario(petitioner)
                .figurita(figOwner)
                .figuritasOfrecidas(List.of(figPetitioner))
                .estado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE)
                .build();
    }

    @Test
    public void testAceptarSolicitudLimpiaPublicaciones() {
        when(repository.findById("sol-1")).thenReturn(Optional.of(solicitud));
        when(figuritaService.transferir("fig-2", owner)).thenReturn(Optional.of(figPetitioner));
        when(figuritaService.transferir("fig-1", petitioner)).thenReturn(Optional.of(figOwner));

        Optional<SolicitudDeIntercambio> result = service.aceptar("sol-1");

        assertTrue(result.isPresent());
        assertEquals(SolicitudDeIntercambio.EstadoSolicitud.ACEPTADO, result.get().getEstado());

        // Verificar transferencias
        verify(figuritaService).transferir("fig-2", owner);
        verify(figuritaService).transferir("fig-1", petitioner);

        // Verificar limpieza de publicaciones
        verify(publicadaService).removeFiguritaFromPublications("fig-1");
        verify(publicadaService).removeFiguritaFromPublications("fig-2");

        // Verificar creación de intercambio
        verify(intercambioService).crear(any(Intercambio.class));
    }
}