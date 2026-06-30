package com.grupo3.tp.service;

import com.grupo3.tp.models.Jugador;
import com.grupo3.tp.repository.JugadorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JugadorServiceTest {

    @Mock private JugadorRepository repository;
    @InjectMocks private JugadorService service;

    private Jugador jugador;

    @BeforeEach
    public void setUp() {
        jugador = new Jugador("jug-1", "Lionel Messi");
    }

    @Test
    public void testCrearJugador() {
        when(repository.save(any(Jugador.class))).thenReturn(jugador);
        Jugador result = service.crear(jugador);
        assertNotNull(result);
        assertEquals("Lionel Messi", result.getNombre());
        verify(repository, times(1)).save(jugador);
    }

    @Test
    public void testObtenerPorId() {
        when(repository.findById("jug-1")).thenReturn(Optional.of(jugador));
        Optional<Jugador> result = service.obtenerPorId("jug-1");
        assertTrue(result.isPresent());
        assertEquals("jug-1", result.get().getId());
    }

    @Test
    public void testActualizarExistente() {
        when(repository.existsById("jug-1")).thenReturn(true);
        when(repository.save(any(Jugador.class))).thenAnswer(i -> i.getArgument(0));

        Jugador update = new Jugador(null, "Leo Messi");
        Optional<Jugador> result = service.actualizar("jug-1", update);

        assertTrue(result.isPresent());
        assertEquals("jug-1", result.get().getId());
        assertEquals("Leo Messi", result.get().getNombre());
    }

    @Test
    public void testEliminarExistente() {
        when(repository.existsById("jug-1")).thenReturn(true);
        boolean result = service.eliminar("jug-1");
        assertTrue(result);
        verify(repository, times(1)).deleteById("jug-1");
    }
}