package com.grupo3.tp.service;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static com.grupo3.tp.models.SolicitudDeIntercambio.EstadoSolicitud.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SolicitudDeIntercambioServiceTest {

    @Mock private SolicitudDeIntercambioRepository repo;
    @Mock private NotificacionService notificacionService;
    @Mock private FiguritaService figuritaService;
    @Mock private IntercambioService intercambioService;
    @Mock private FiguritaPublicadaService publicadaService;
    @Mock private MongoTemplate mongoTemplate;

    private SolicitudDeIntercambioService service;

    private Usuario proposer;
    private Usuario figuritaOwner;
    private Figurita figurita;
    private Figurita figurita2;
    private SolicitudDeIntercambio solicitud1;
    private SolicitudDeIntercambio solicitud2;
    private SolicitudDeIntercambio solicitud3;
    private List<Figurita> figuritas = new ArrayList<>();

    @BeforeEach
    public void setUp() {
        service = new SolicitudDeIntercambioService(
                repo, notificacionService, figuritaService,
                intercambioService, publicadaService, mongoTemplate
        );

        proposer = Usuario.builder()
                .id("user-1").username("juan").email("juan@example.com").build();

        figuritaOwner = Usuario.builder()
                .id("user-2").username("maria").email("maria@example.com").build();

        FiguritaBase figuritaBase = FiguritaBase.builder()
                .id("fig-base-1").numero(1)
                .seleccion(new Seleccion("sel-1", "Argentina", "A"))
                .equipo(new Equipo("eq-1", "River"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-1", "Messi"))
                .build();

        figurita = Figurita.builder()
                .id("fig-1").figuritaBase(figuritaBase).owner(figuritaOwner).build();

        figurita2 = Figurita.builder()
                .id("fig-2").figuritaBase(figuritaBase).owner(proposer).build();

        figuritas.add(figurita2);

        solicitud1 = SolicitudDeIntercambio.builder()
                .id("sol-1").usuario(proposer).figurita(figurita)
                .estado(PENDIENTE).cantidadDisponible(1)
                .figuritasOfrecidas(figuritas).build();

        solicitud2 = SolicitudDeIntercambio.builder()
                .id("sol-2").usuario(proposer).figurita(figurita)
                .estado(PENDIENTE).cantidadDisponible(1).build();

        solicitud3 = SolicitudDeIntercambio.builder()
                .id("sol-3").usuario(figuritaOwner).figurita(figurita2)
                .estado(PENDIENTE).cantidadDisponible(1).build();
    }

    // ── crear ──────────────────────────────────────────────────────────────

    @Test
    public void testCrearSolicitudAndNotifyFiguritaOwner() {
        when(repo.save(any(SolicitudDeIntercambio.class))).thenReturn(solicitud1);

        SolicitudDeIntercambio result = service.crear(solicitud1);

        assertNotNull(result);
        assertEquals("sol-1", result.getId());
        assertEquals("juan", result.getUsuario().getUsername());

        ArgumentCaptor<SolicitudDeIntercambio> captor = ArgumentCaptor.forClass(SolicitudDeIntercambio.class);
        verify(repo).save(captor.capture());
        assertEquals(PENDIENTE, captor.getValue().getEstado());

        ArgumentCaptor<Notificacion> notifCaptor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService).crear(notifCaptor.capture());
        Notificacion notif = notifCaptor.getValue();
        assertEquals(figuritaOwner.getId(), notif.getUsuario().getId());
        assertEquals("propuesta", notif.getTipo());
        assertTrue(notif.getTitulo().contains("propuesta"));
        assertFalse(notif.getLeida());
    }

    @Test
    public void testThrowExceptionIfFailsDuringCrear() {
        when(repo.save(any(SolicitudDeIntercambio.class)))
                .thenThrow(new RuntimeException("Database error"));

        assertThrows(RuntimeException.class, () -> service.crear(solicitud1));
        verify(notificacionService, never()).crear(any());
    }

    // ── obtenerPorId ───────────────────────────────────────────────────────

    @Test
    public void testObtenerPorIdExistente() {
        when(repo.findById("sol-1")).thenReturn(Optional.of(solicitud1));

        Optional<SolicitudDeIntercambio> result = service.obtenerPorId("sol-1");

        assertTrue(result.isPresent());
        assertEquals("sol-1", result.get().getId());
        verify(repo, times(1)).findById("sol-1");
    }

    @Test
    public void testObtenerPorIdNoExistente() {
        when(repo.findById("sol-1000")).thenReturn(Optional.empty());
        Optional<SolicitudDeIntercambio> result = service.obtenerPorId("sol-1000");
        assertFalse(result.isPresent());
    }

    // ── obtenerTodas ───────────────────────────────────────────────────────

    @Test
    public void testObtenerTodas() {
        List<SolicitudDeIntercambio> testList = List.of(solicitud1, solicitud2, solicitud3);
        when(repo.findAll()).thenReturn(testList);

        List<SolicitudDeIntercambio> result = service.obtenerTodas();

        assertTrue(result.containsAll(testList));
        verify(repo, times(1)).findAll();
    }

    @Test
    public void testObtenerTodasListaVacia() {
        when(repo.findAll()).thenReturn(List.of());

        List<SolicitudDeIntercambio> result = service.obtenerTodas();

        assertTrue(result.isEmpty());
        verify(repo, times(1)).findAll();
    }

    // ── actualizar ─────────────────────────────────────────────────────────

    @Test
    public void actualizarSolicitudExistente() {
        when(repo.existsById("sol-1")).thenReturn(true);
        when(repo.save(any(SolicitudDeIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        Optional<SolicitudDeIntercambio> result = service.actualizar("sol-1", solicitud2);

        assertTrue(result.isPresent());
        assertEquals("sol-1", result.get().getId());
    }

    @Test
    public void actualizarSolicitudNoExistente() {
        when(repo.existsById("sol-100")).thenReturn(false);

        Optional<SolicitudDeIntercambio> result = service.actualizar("sol-100", solicitud2);

        assertFalse(result.isPresent());
    }

    // ── eliminar ───────────────────────────────────────────────────────────

    @Test
    public void eliminarSolicitudExistente() {
        when(repo.existsById("sol-1")).thenReturn(true);

        boolean result = service.eliminar("sol-1");

        assertTrue(result);
        verify(repo).deleteById("sol-1");
    }

    @Test
    public void eliminarSolicitudNoExistente() {
        when(repo.existsById("sol-1")).thenReturn(false);

        boolean result = service.eliminar("sol-1");

        assertFalse(result);
        verify(repo, never()).deleteById("sol-1");
    }

    // ── obtenerRecibidas ───────────────────────────────────────────────────

    @Test
    public void obtenerRecibidas() {
        when(figuritaService.obtenerTodasInternaPorUserId("user-2"))
                .thenReturn(List.of(figurita));
        when(repo.findByFiguritaIds(List.of("fig-1")))
                .thenReturn(List.of(solicitud1));

        List<SolicitudDeIntercambio> result = service.obtenerRecibidas("user-2");

        assertEquals(1, result.size());
        assertEquals("sol-1", result.get(0).getId());
    }

    @Test
    public void obtenerRecibidasVacia() {
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of());

        List<SolicitudDeIntercambio> result = service.obtenerRecibidas("user-1");

        assertTrue(result.isEmpty());
        verify(repo, never()).findByFiguritaIds(any());
    }

    // ── obtenerRecibidas paginado ──────────────────────────────────────────

    @Test
    public void testObtenerRecibidasPaginadoDevuelvePageConTotales() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "id"));
        Page<SolicitudDeIntercambio> repoPage =
                new PageImpl<>(List.of(solicitud1), PageRequest.of(0, 10), 1);
        when(repo.findByFiguritaOwnerId("user-2", pageable)).thenReturn(repoPage);

        Page<SolicitudDeIntercambio> result = service.obtenerRecibidas("user-2", pageable);

        assertEquals(1, result.getContent().size());
        assertEquals("sol-1", result.getContent().get(0).getId());
        assertEquals(1, result.getTotalElements());
    }

    // ── obtenerEnviadas ────────────────────────────────────────────────────

    @Test
    public void obtenerEnviadas() {
        when(repo.findByUsuarioId("user-1")).thenReturn(List.of(solicitud1, solicitud2));

        List<SolicitudDeIntercambio> result = service.obtenerEnviadas("user-1");

        assertEquals(2, result.size());
        verify(repo, times(1)).findByUsuarioId("user-1");
    }

    @Test
    public void obtenerEnviadasVacia() {
        when(repo.findByUsuarioId("user-1")).thenReturn(List.of());

        List<SolicitudDeIntercambio> result = service.obtenerEnviadas("user-1");

        assertTrue(result.isEmpty());
    }

    // ── obtenerEnviadas paginado ───────────────────────────────────────────

    @Test
    public void testObtenerEnviadasPaginadoDevuelvePageConTotales() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "id"));
        Page<SolicitudDeIntercambio> repoPage =
                new PageImpl<>(List.of(solicitud1), PageRequest.of(0, 10), 1);
        when(repo.findByUsuarioId("user-1", pageable)).thenReturn(repoPage);

        Page<SolicitudDeIntercambio> result = service.obtenerEnviadas("user-1", pageable);

        assertEquals(1, result.getContent().size());
        assertEquals(1, result.getTotalElements());
    }

    // ── aceptar ────────────────────────────────────────────────────────────

    @Test
    public void aceptarSolicitudNotificarProposer() {
        // findAndModify returns the updated solicitud (estado = ACEPTADO)
        SolicitudDeIntercambio aceptada = SolicitudDeIntercambio.builder()
                .id("sol-1").usuario(proposer).figurita(figurita)
                .estado(ACEPTADO).cantidadDisponible(1)
                .figuritasOfrecidas(figuritas).build();

        when(mongoTemplate.findAndModify(
                any(Query.class), any(Update.class), any(), eq(SolicitudDeIntercambio.class)))
                .thenReturn(aceptada);

        when(figuritaService.transferir("fig-2", figuritaOwner))
                .thenReturn(Optional.of(figurita2));
        when(figuritaService.transferir("fig-1", proposer))
                .thenReturn(Optional.of(figurita));

        Optional<SolicitudDeIntercambio> result = service.aceptar("sol-1");

        assertTrue(result.isPresent());
        assertEquals(ACEPTADO, result.get().getEstado());

        verify(figuritaService).transferir("fig-2", figuritaOwner);
        verify(figuritaService).transferir("fig-1", proposer);

        ArgumentCaptor<Intercambio> intercambioCaptor = ArgumentCaptor.forClass(Intercambio.class);
        verify(intercambioService).crear(intercambioCaptor.capture());
        assertEquals(proposer.getId(), intercambioCaptor.getValue().getUsuarioGenerador().getId());
        assertEquals(figuritaOwner.getId(), intercambioCaptor.getValue().getUsuarioIntercambiador().getId());

        ArgumentCaptor<Notificacion> notifCaptor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService).crear(notifCaptor.capture());
        assertEquals(proposer.getId(), notifCaptor.getValue().getUsuario().getId());
    }

    @Test
    public void aceptarSolicitudTransferirFallsThrowsException() {
        SolicitudDeIntercambio aceptada = SolicitudDeIntercambio.builder()
                .id("sol-1").usuario(proposer).figurita(figurita)
                .estado(ACEPTADO).cantidadDisponible(1)
                .figuritasOfrecidas(figuritas).build();

        when(mongoTemplate.findAndModify(
                any(Query.class), any(Update.class), any(), eq(SolicitudDeIntercambio.class)))
                .thenReturn(aceptada);

        when(figuritaService.transferir("fig-2", figuritaOwner))
                .thenReturn(Optional.empty()); // Transfer fails

        assertThrows(RuntimeException.class, () -> service.aceptar("sol-1"));

        verify(intercambioService, never()).crear(any());
        verify(notificacionService, never()).crear(any());
    }

    @Test
    public void aceptarSolicitudNoExistente() {
        when(mongoTemplate.findAndModify(
                any(Query.class), any(Update.class), any(), eq(SolicitudDeIntercambio.class)))
                .thenReturn(null); // Not found or already processed

        Optional<SolicitudDeIntercambio> result = service.aceptar("sol-999");

        assertFalse(result.isPresent());
        verify(figuritaService, never()).transferir(any(), any());
        verify(intercambioService, never()).crear(any());
        verify(notificacionService, never()).crear(any());
    }

    // ── rechazar ───────────────────────────────────────────────────────────

    @Test
    public void rechazarSolicitudNotificarProposer() {
        when(repo.findById("sol-1")).thenReturn(Optional.of(solicitud1));
        when(repo.save(any(SolicitudDeIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        Optional<SolicitudDeIntercambio> result = service.rechazar("sol-1");

        assertTrue(result.isPresent());
        assertEquals(RECHAZADO, result.get().getEstado());

        verify(figuritaService, never()).transferir(any(), any());
        verify(intercambioService, never()).crear(any());

        ArgumentCaptor<Notificacion> notifCaptor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService).crear(notifCaptor.capture());
        assertEquals(proposer.getId(), notifCaptor.getValue().getUsuario().getId());
    }

    @Test
    public void rechazarSolicitudNoExistente() {
        when(repo.findById("sol-999")).thenReturn(Optional.empty());

        Optional<SolicitudDeIntercambio> result = service.rechazar("sol-999");

        assertFalse(result.isPresent());
        verify(repo, never()).save(any());
        verify(notificacionService, never()).crear(any());
    }
}