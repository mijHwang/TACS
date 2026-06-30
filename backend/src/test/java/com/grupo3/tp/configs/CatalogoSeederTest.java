package com.grupo3.tp.configs;

import com.grupo3.tp.service.CatalogoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogoSeederTest {

    @Mock CatalogoService catalogoService;
    @InjectMocks CatalogoSeeder seeder;

    @Test
    void cargaCuandoElCatalogoEstaVacio() throws Exception {
        when(catalogoService.catalogoVacio()).thenReturn(true);
        when(catalogoService.cargarDesdeJson())
                .thenReturn(new CatalogoService.ResultadoCarga(48, 3, 200, 850, 850));

        seeder.run();

        verify(catalogoService).cargarDesdeJson();
    }

    @Test
    void noCargaCuandoYaHayCatalogo() throws Exception {
        when(catalogoService.catalogoVacio()).thenReturn(false);

        seeder.run();

        verify(catalogoService, never()).cargarDesdeJson();
    }
}
