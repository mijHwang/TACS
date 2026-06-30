package com.grupo3.tp.service;

import com.grupo3.tp.dtos.SugerenciaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FiguritaRepository;
import com.grupo3.tp.repository.SugerenciaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SugerenciaServiceTest {

    @Mock private SugerenciaRepository sugerenciaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private FiguritaRepository figuritaRepository;
    @InjectMocks private SugerenciaService service;

    private Usuario juan;
    private Usuario maria;

    @BeforeEach
    public void setUp() {
        juan = Usuario.builder().id("user-1").username("juan").build();
        maria = Usuario.builder().id("user-2").username("maria").build();
    }

    @Test
    public void testObtenerPorUsuarioMapeaADTO() {
        Sugerencia s = Sugerencia.builder()
                .usuarioId("user-1").contraparteId("user-2").contraparteNombre("maria")
                .figuritasARecibir(List.of()).figuritasAOfrecer(List.of()).build();

        when(sugerenciaRepository.findByUsuarioId("user-1")).thenReturn(List.of(s));

        List<SugerenciaResponseDTO> dtos = service.obtenerPorUsuario("user-1");

        assertEquals(1, dtos.size());
        assertEquals("maria", dtos.get(0).getContraparteNombre());
        verify(sugerenciaRepository).findByUsuarioId("user-1");
    }
}