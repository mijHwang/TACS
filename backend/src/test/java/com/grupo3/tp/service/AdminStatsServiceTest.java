package com.grupo3.tp.service;

import com.grupo3.tp.dtos.PlatformStatsDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SubastaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AdminStatsServiceTest {

    @Mock private SubastaRepository subastaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @InjectMocks private AdminStatsService service;

    @Test
    public void testGetStatsAgregaDatosCorrectamente() {
        Usuario user1 = Usuario.builder().username("owner").build();
        Usuario user2 = Usuario.builder().username("bidder").build();

        Oferta oferta = Oferta.builder().id("of-1").usuario(user2).fechaOferta(LocalDateTime.now()).build();

        Subasta subasta = Subasta.builder()
                .id("sub-1")
                .estado(EstadoSubasta.EN_CURSO)
                .usuario(user1)
                .horaInicio(LocalDateTime.now().minusDays(1))
                .ofertas(List.of(oferta))
                .figurita(Figurita.builder().figuritaBase(FiguritaBase.builder().numero(10).build()).build())
                .build();

        when(usuarioRepository.findAll()).thenReturn(List.of(user1, user2));
        when(subastaRepository.findAll()).thenReturn(List.of(subasta));

        PlatformStatsDTO stats = service.getStats();

        assertEquals(2, stats.getTotalUsers());
        assertEquals(1, stats.getTotalAuctions());
        assertEquals(1, stats.getActiveAuctions());
        assertEquals(1, stats.getTotalBids());

        // Verifica Top Bidders
        assertEquals(1, stats.getTopBidders().size());
        assertEquals("bidder", stats.getTopBidders().get(0).getUsername());

        // Verifica Recent Activity (Creación de subasta y oferta)
        assertEquals(2, stats.getRecentActivity().size());
    }
}