package com.grupo3.tp.service;

import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.NotificacionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificacionServiceTest {

    @Mock private NotificacionRepository repository;
    @InjectMocks private NotificacionService service;

    private Usuario creador;
    private Usuario interesado;

    @BeforeEach
    public void setUp() {
        creador = Usuario.builder().id("user-1").username("creador").build();
        interesado = Usuario.builder().id("user-2").username("interesado").build();
    }

    @Test
    public void testNotificarUsuariosFaltantesSubasta() {
        // Ejecutar
        service.notificarUsuariosFaltantesSubasta(
                List.of(creador, interesado), "Messi", "user-1", "sub-1"
        );

        // Verificar que solo se notifique al interesado (no al creador)
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Notificacion>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository, times(1)).saveAll(captor.capture());

        List<Notificacion> guardadas = captor.getValue();
        assertEquals(1, guardadas.size());
        assertEquals("user-2", guardadas.get(0).getUsuario().getId());
        assertEquals("subasta", guardadas.get(0).getTipo());
    }

    @Test
    public void testNotificarUsuariosFaltantes() {
        // Ejecutar
        service.notificarUsuariosFaltantes(
                List.of(creador, interesado), "Messi", "user-1"
        );

        // Verificar que solo se guarde la notificacion del interesado
        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(repository, times(1)).save(captor.capture());

        assertEquals("user-2", captor.getValue().getUsuario().getId());
        assertEquals("publicacion", captor.getValue().getTipo());
    }

    @Test
    public void testMarcarComoLeida() {
        Notificacion notif = Notificacion.builder().id("notif-1").leida(false).build();
        when(repository.findById("notif-1")).thenReturn(Optional.of(notif));

        Optional<Notificacion> result = service.marcarComoLeida("notif-1");

        assertTrue(result.isPresent());
        assertTrue(result.get().getLeida());
        verify(repository, times(1)).save(notif);
    }
}