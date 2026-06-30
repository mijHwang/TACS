package com.grupo3.tp.service;

import com.grupo3.tp.models.Seleccion;
import com.grupo3.tp.repository.SeleccionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SeleccionServiceTest {

    @Mock private SeleccionRepository repository;
    @InjectMocks private SeleccionService service;

    private Seleccion seleccion;

    @BeforeEach
    public void setUp() {
        seleccion = new Seleccion("sel-1", "Argentina", "ARG");
    }

    @Test
    public void testCrearSeleccion() {
        when(repository.save(any(Seleccion.class))).thenReturn(seleccion);
        Seleccion result = service.crear(seleccion);
        assertNotNull(result);
        assertEquals("Argentina", result.getNombre());
        verify(repository, times(1)).save(seleccion);
    }

    @Test
    public void testObtenerPorId() {
        when(repository.findById("sel-1")).thenReturn(Optional.of(seleccion));
        Optional<Seleccion> result = service.obtenerPorId("sel-1");
        assertTrue(result.isPresent());
        assertEquals("sel-1", result.get().getId());
    }

    @Test
    public void testActualizarExistente() {
        when(repository.existsById("sel-1")).thenReturn(true);
        when(repository.save(any(Seleccion.class))).thenAnswer(i -> i.getArgument(0));

        Seleccion update = new Seleccion(null, "Brasil", "BRA");
        Optional<Seleccion> result = service.actualizar("sel-1", update);

        assertTrue(result.isPresent());
        assertEquals("sel-1", result.get().getId());
        assertEquals("Brasil", result.get().getNombre());
    }

    @Test
    public void testEliminarExistente() {
        when(repository.existsById("sel-1")).thenReturn(true);
        boolean result = service.eliminar("sel-1");
        assertTrue(result);
        verify(repository, times(1)).deleteById("sel-1");
    }
}