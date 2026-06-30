package com.grupo3.tp.service;

import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.repository.FiguritaBaseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FiguritaBaseServiceTest {
    @Mock private FiguritaBaseRepository repository;
    @InjectMocks private FiguritaBaseService service;

    @Test
    public void testActualizar() {
        FiguritaBase base = FiguritaBase.builder().build();
        when(repository.existsById("1")).thenReturn(true);
        when(repository.save(base)).thenReturn(base);

        Optional<FiguritaBase> result = service.actualizar("1", base);
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