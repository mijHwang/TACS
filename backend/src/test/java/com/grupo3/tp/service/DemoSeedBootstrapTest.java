package com.grupo3.tp.service;

import com.grupo3.tp.dtos.DemoSeedResultDTO;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DemoSeedBootstrapTest {

    @Mock UsuarioRepository usuarioRepo;
    @Mock DemoSeedService demoSeedService;
    @InjectMocks DemoSeedBootstrap bootstrap;

    @Test
    void seedaCuandoLaBaseEstaVacia() {
        when(usuarioRepo.count()).thenReturn(0L);
        when(demoSeedService.seed()).thenReturn(DemoSeedResultDTO.builder().usuarios(12).build());

        assertTrue(bootstrap.seedSiVacio());
        verify(demoSeedService).seed();
    }

    @Test
    void noSeedaCuandoLaBaseTieneDatos() {
        when(usuarioRepo.count()).thenReturn(5L);

        assertFalse(bootstrap.seedSiVacio());
        verify(demoSeedService, never()).seed();
    }
}
