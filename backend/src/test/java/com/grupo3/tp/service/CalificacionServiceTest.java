package com.grupo3.tp.service;

import com.grupo3.tp.models.Calificacion;
import com.grupo3.tp.repository.CalificacionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CalificacionServiceTest {
    @Mock private CalificacionRepository repository;
    @InjectMocks private CalificacionService service;

    @Test
    public void testCrudOperations() {
        // El campo del modelo es "calificacion", no "puntaje"
        Calificacion cal = Calificacion.builder()
                .id("1")
                .calificacion(5)
                .build();

        // Save
        when(repository.save(cal)).thenReturn(cal);
        assertEquals(5, service.crear(cal).getCalificacion()); // getCalificacion()

        // Find
        when(repository.findById("1")).thenReturn(Optional.of(cal));
        assertTrue(service.obtenerPorId("1").isPresent());

        // Delete
        when(repository.existsById("1")).thenReturn(true);
        assertTrue(service.eliminar("1"));
        verify(repository).deleteById("1");
    }
}