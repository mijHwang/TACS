package com.grupo3.tp.service;

import com.grupo3.tp.models.CondicionImpl;
import com.grupo3.tp.repository.CondicionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CondicionServiceTest {
    @Mock private CondicionRepository repository;
    @InjectMocks private CondicionService service;

    @Test
    public void testActualizar() {
        CondicionImpl condicion = new CondicionImpl();
        when(repository.existsById("1")).thenReturn(true);
        when(repository.save(condicion)).thenReturn(condicion);

        Optional<CondicionImpl> result = service.actualizar("1", condicion);
        assertTrue(result.isPresent());
        assertEquals("1", result.get().getId());
    }

    @Test
    public void testEliminarFallaSiNoExiste() {
        when(repository.existsById("1")).thenReturn(false);
        assertFalse(service.eliminar("1"));
        verify(repository, never()).deleteById("1");
    }
}