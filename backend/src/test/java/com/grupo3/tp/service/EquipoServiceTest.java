package com.grupo3.tp.service;

import com.grupo3.tp.models.Equipo;
import com.grupo3.tp.repository.EquipoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EquipoServiceTest {
    @Mock private EquipoRepository repository;
    @InjectMocks private EquipoService service;

    @Test
    public void testActualizar() {
        Equipo equipo = Equipo.builder().build();
        when(repository.existsById("1")).thenReturn(true);
        when(repository.save(equipo)).thenReturn(equipo);

        Optional<Equipo> result = service.actualizar("1", equipo);
        assertTrue(result.isPresent());
        assertEquals("1", result.get().getId());
    }

    @Test
    public void testEliminar() {
        when(repository.existsById("1")).thenReturn(true);
        assertTrue(service.eliminar("1"));
        verify(repository).deleteById("1");
    }
}