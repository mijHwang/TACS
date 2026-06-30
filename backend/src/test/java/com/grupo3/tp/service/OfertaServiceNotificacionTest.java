package com.grupo3.tp.service;

import com.grupo3.tp.dtos.OfertaDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.OfertaRepository;
import com.grupo3.tp.repository.SubastaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Test unitario (sin Spring/Mongo) del mensaje de notificación que recibe el dueño
 * de la subasta cuando alguien oferta. Debe mostrar el username del ofertante,
 * no el ObjectId crudo.
 */
public class OfertaServiceNotificacionTest {

    private static final String OFERTANTE_ID = "6a43dc9ad7511663833e5f96";
    private static final String OFERTANTE_USERNAME = "sofia";
    private static final String SUBASTA_ID = "subasta-1";
    private static final String FIGURITA_ID = "figurita-1";

    private OfertaRepository ofertaRepository;
    private SubastaRepository subastaRepository;
    private NotificacionService notificacionService;
    private UsuarioService usuarioService;
    private FiguritaService figuritaService;

    private OfertaService ofertaService;

    @BeforeEach
    void setup() {
        ofertaRepository = mock(OfertaRepository.class);
        subastaRepository = mock(SubastaRepository.class);
        notificacionService = mock(NotificacionService.class);
        usuarioService = mock(UsuarioService.class);
        figuritaService = mock(FiguritaService.class);

        ofertaService = new OfertaService(
                ofertaRepository,
                subastaRepository,
                notificacionService,
                usuarioService,
                figuritaService
        );

        Usuario ofertante = Usuario.builder()
                .id(OFERTANTE_ID)
                .username(OFERTANTE_USERNAME)
                .build();

        Usuario duenio = Usuario.builder()
                .id("owner-id")
                .username("dueño")
                .build();

        Subasta subasta = Subasta.builder()
                .usuario(duenio)
                .ofertas(new ArrayList<>())
                .build();

        Figurita figurita = Figurita.builder()
                .owner(ofertante)
                .build();

        when(subastaRepository.findById(SUBASTA_ID)).thenReturn(Optional.of(subasta));
        when(usuarioService.obtenerPorId(OFERTANTE_ID)).thenReturn(Optional.of(ofertante));
        when(figuritaService.obtenerPorId(FIGURITA_ID)).thenReturn(Optional.of(figurita));
        when(ofertaRepository.findAll()).thenReturn(new ArrayList<>());
        when(ofertaRepository.save(any(Oferta.class))).thenAnswer(inv -> inv.getArgument(0));
        when(subastaRepository.save(any(Subasta.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void laNotificacionUsaElUsernameDelOfertanteNoElId() {
        OfertaDTO dto = new OfertaDTO();
        dto.setSubastaId(SUBASTA_ID);
        dto.setUsuarioId(OFERTANTE_ID);
        dto.setFiguritaIds(List.of(FIGURITA_ID));

        ofertaService.crear(dto);

        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService).crear(captor.capture());
        Notificacion notif = captor.getValue();

        assertEquals(OFERTANTE_USERNAME + " te manda una nueva oferta.", notif.getMensaje());
        assertFalse(notif.getMensaje().contains(OFERTANTE_ID),
                "La notificación no debe contener el ObjectId crudo del ofertante");
    }
}
