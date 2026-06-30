package com.grupo3.tp.service;

import com.grupo3.tp.models.CategoriaFigurita;
import com.grupo3.tp.repository.CategoriaFiguritaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CategoriaFiguritaServiceTest {
    @Mock private CategoriaFiguritaRepository repository;
    @InjectMocks private CategoriaFiguritaService service;

    @Test
    public void testCrearYObtener() {
        CategoriaFigurita cat = CategoriaFigurita.builder().id("1").nombre("Oro").build();

        when(repository.save(cat)).thenReturn(cat);
        CategoriaFigurita result = service.crear(cat);
        assertEquals("Oro", result.getNombre());

        when(repository.findById("1")).thenReturn(Optional.of(cat));
        assertTrue(service.obtenerPorId("1").isPresent());
    }
}