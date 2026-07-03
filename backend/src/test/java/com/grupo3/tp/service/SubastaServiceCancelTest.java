package com.grupo3.tp.service;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SubastaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubastaServiceCancelTest {

    @Mock private SubastaRepository repository;
    @Mock private FiguritaService figuritaService;
    @Mock private NotificacionService notificacionService;
    @Mock private UsuarioService usuarioService;
    @Mock private UsuarioRepository usuarioRepository;

    private SubastaService service;

    @BeforeEach
    public void setUp() {
        service = new SubastaService(repository, figuritaService, notificacionService, usuarioService, usuarioRepository);
    }

    @Test
    public void cancelarPorFiguritaMarcaCanceladaYNotificaAOfertantes() {
        FiguritaBase base = FiguritaBase.builder().id("base-1").numero(1)
                .seleccion(new Seleccion("s", "Argentina", "A"))
                .equipo(new Equipo("e", "Equipo"))
                .categoria(new CategoriaFigurita("c", "Oro"))
                .jugador(new Jugador("j", "Messi")).build();
        Figurita fig = Figurita.builder().id("fig-1").figuritaBase(base).build();
        Usuario postor = Usuario.builder().id("user-9").username("pedro").build();
        Oferta oferta = Oferta.builder().id("of-1").usuario(postor).figuritas(List.of()).build();
        Subasta subasta = Subasta.builder().id("sub-1").figurita(fig)
                .estado(EstadoSubasta.EN_CURSO).ofertas(List.of(oferta)).build();

        when(repository.findByFiguritaId("fig-1")).thenReturn(List.of(subasta));

        service.cancelarPorFigurita("fig-1");

        assertEquals(EstadoSubasta.CANCELADA, subasta.getEstado());
        verify(repository).save(subasta);
        verify(notificacionService).crear(argThat(n ->
                n.getUsuario() == postor && "subasta".equals(n.getTipo())));
    }

    @Test
    public void cancelarPorFiguritaSinSubastasNoHaceNada() {
        when(repository.findByFiguritaId("fig-1")).thenReturn(List.of());
        service.cancelarPorFigurita("fig-1");
        verify(repository, never()).save(any());
        verify(notificacionService, never()).crear(any());
    }
}
