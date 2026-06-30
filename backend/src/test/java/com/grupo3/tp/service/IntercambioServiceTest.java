package com.grupo3.tp.service;

import com.grupo3.tp.dtos.IntercambioResponseDTO;
import com.grupo3.tp.dtos.ReputacionResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.IntercambioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class IntercambioServiceTest {

    @Mock private IntercambioRepository repository;
    @InjectMocks private IntercambioService service;

    private Usuario generador;
    private Usuario intercambiador;
    private Intercambio intercambio;

    @BeforeEach
    public void setUp() {
        generador = Usuario.builder().id("user-1").username("juan").build();
        intercambiador = Usuario.builder().id("user-2").username("maria").build();

        FiguritaBase base = FiguritaBase.builder()
                .jugador(new Jugador("j1", "Messi"))
                .build();
        Figurita figurita = Figurita.builder().id("fig-1").figuritaBase(base).build();

        intercambio = Intercambio.builder()
                .id("int-1")
                .usuarioGenerador(generador)
                .usuarioIntercambiador(intercambiador)
                .figurita(figurita)
                .figuritaIntercambiada(new ArrayList<>())
                .fecha(LocalDateTime.now())
                .build();
    }

    // ============= CALIFICAR TESTS =============
    @Test
    public void testCalificarGeneradorExitoso() {
        when(repository.findById("int-1")).thenReturn(Optional.of(intercambio));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        Intercambio result = service.calificar("int-1", "user-1", 5);

        // Generador califica al intercambiador → se setea puntajeIntercambiador
        assertEquals(5, result.getPuntajeIntercambiador());
        verify(repository, times(1)).save(intercambio);
    }

    @Test
    public void testCalificarYaCalificadoLanzaExcepcion() {
        intercambio.setPuntajeIntercambiador(4); // Already rated
        when(repository.findById("int-1")).thenReturn(Optional.of(intercambio));

        assertThrows(IllegalArgumentException.class, () -> service.calificar("int-1", "user-1", 5));
        verify(repository, never()).save(any());
    }

    @Test
    public void testCalificarPuntajeInvalidoLanzaExcepcion() {
        when(repository.findById("int-1")).thenReturn(Optional.of(intercambio));

        assertThrows(IllegalArgumentException.class, () -> service.calificar("int-1", "user-1", 6));
        assertThrows(IllegalArgumentException.class, () -> service.calificar("int-1", "user-1", 0));
    }

    @Test
    public void testCalificarUsuarioNoParticipanteLanzaExcepcion() {
        when(repository.findById("int-1")).thenReturn(Optional.of(intercambio));

        assertThrows(IllegalArgumentException.class, () -> service.calificar("int-1", "user-3", 5));
    }

    // ============= REPUTACION TESTS =============
    @Test
    public void testCalcularReputacion() {
        // Dos intercambios donde el usuario "user-1" recibe una calificación de 5 y otra de 4
        Intercambio i1 = Intercambio.builder()
                .usuarioGenerador(generador)
                .usuarioIntercambiador(intercambiador)
                .puntajeGenerador(5)   // rating recibido por generador (user-1)
                .build();
        Intercambio i2 = Intercambio.builder()
                .usuarioGenerador(intercambiador)
                .usuarioIntercambiador(generador)
                .puntajeIntercambiador(4) // rating recibido por generador (user-1) cuando actúa como intercambiador
                .build();

        when(repository.findByUsuarioId("user-1")).thenReturn(List.of(i1, i2));

        ReputacionResponseDTO rep = service.calcularReputacion("user-1");

        // Verificar campos según la estructura real del DTO
        assertEquals(4.5, rep.getScore());
        assertEquals(2, rep.getTotal());
        assertEquals(1, rep.getCincoEstrellas());
        assertEquals(1, rep.getCuatroEstrellas());
        assertEquals(0, rep.getTresEstrellas());
        assertEquals(0, rep.getDosEstrellas());
        assertEquals(0, rep.getUnaEstrella());
    }
}