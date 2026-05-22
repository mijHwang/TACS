package com.grupo3.tp.service;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
import jakarta.validation.constraints.Null;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static com.grupo3.tp.models.SolicitudDeIntercambio.EstadoSolicitud.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SolicitudDelIntercambioServiceTest {

    @Mock
    private SolicitudDeIntercambioRepository repo;

    @Mock
    private NotificacionService notificacionService;

    @Mock
    private FiguritaService figuritaService;

    @Mock
    private IntercambioService intercambioService;

    @InjectMocks
    private SolicitudDeIntercambioService service;

    private Usuario proposer;
    private Usuario figuritaOwner;
    private Figurita figurita;
    private Figurita figurita2;
    private SolicitudDeIntercambio solicitudDelIntercambio1;
    private SolicitudDeIntercambio solicitudDelIntercambio2;
    private SolicitudDeIntercambio solicitudDelIntercambio3;
    private List<Figurita> figuritas = new ArrayList<>();

    //Test data creation before we actually do the stuff.
    @BeforeEach
    public void setUp() {



        proposer = Usuario.builder()
                .id("user-1")
                .username("juan")
                .email("juan@example.com")
                .build();

        figuritaOwner = Usuario.builder()
                .id("user-2")
                .username("maria")
                .email("maria@example.com")
                .build();

        FiguritaBase figuritaBase = FiguritaBase.builder()
                .id("fig-base-1")
                .numero(1)
                .seleccion(new Seleccion("sel-1", "Argentina", "A"))
                .equipo(new Equipo("eq-1", "River"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-1", "Messi"))
                .build();

        figurita = Figurita.builder()
                .id("fig-1")
                .figuritaBase(figuritaBase)
                .owner(figuritaOwner)
                .build();

        figurita2 = Figurita.builder()
                .id("fig-2")
                .figuritaBase(figuritaBase)
                .owner(proposer)
                .build();

        solicitudDelIntercambio1 = SolicitudDeIntercambio.builder()
                .id("sol-1")
                .usuario(proposer)
                .figurita(figurita)
                .estado(PENDIENTE)
                .cantidadDisponible(1)
                .figuritasOfrecidas(figuritas)
                .build();

        solicitudDelIntercambio2 = SolicitudDeIntercambio.builder()
                .id("sol-2")
                .usuario(proposer)
                .figurita(figurita)
                .estado(PENDIENTE)
                .cantidadDisponible(1)
                .build();

        solicitudDelIntercambio3 = SolicitudDeIntercambio.builder()
                .id("sol-3")
                .usuario(figuritaOwner)
                .figurita(figurita2)
                .estado(PENDIENTE)
                .cantidadDisponible(1)
                .build();

        figuritas.add(figurita2);
    }


    //Test proper

    @Test
    public void testCrearSolicitudAndNotifyFiguritaOwner(){

        when(repo.save(any(SolicitudDeIntercambio.class))).thenReturn(solicitudDelIntercambio1);

        SolicitudDeIntercambio result = service.crear(solicitudDelIntercambio1);

        assertNotNull(result);
        assertEquals("sol-1", result.getId());
        assertEquals("juan", result.getUsuario().getUsername());

        ArgumentCaptor<SolicitudDeIntercambio> captor = ArgumentCaptor.forClass(SolicitudDeIntercambio.class);
        verify(repo).save(captor.capture());
        assertEquals(PENDIENTE, captor.getValue().getEstado());

        ArgumentCaptor<Notificacion> notifCaptor  = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService).crear(notifCaptor.capture());

        Notificacion notificacion = notifCaptor.getValue();
        assertEquals(figuritaOwner.getId(), notificacion.getUsuario().getId());
        assertEquals("propuesta", notificacion.getTipo());
        assertTrue(notificacion.getTitulo().contains("propuesta"));
        assertFalse(notificacion.getLeida());

    }

    @Test
    public void testThrowExceptionIfFailsDuringCrear(){

        when(repo.save(any(SolicitudDeIntercambio.class)))
                .thenThrow(new RuntimeException("Database error"));

        assertThrows(RuntimeException.class, () -> service.crear(solicitudDelIntercambio1));
        verify(notificacionService, never()).crear(any());
    }

    @Test
    public void testObtenerPorIdExistente(){

        when(repo.findById("sol-1")).thenReturn(Optional.of(solicitudDelIntercambio1));

        Optional<SolicitudDeIntercambio> result = service.obtenerPorId("sol-1");

        assertTrue(result.isPresent());
        assertEquals("sol-1", result.get().getId());
        verify(repo, times(1)).findById("sol-1");


    }

    @Test
    public void testObtenerPorIdNoExistente(){

        when(repo.findById("sol-1000")).thenReturn(Optional.empty());
        Optional<SolicitudDeIntercambio> result = service.obtenerPorId("sol-1000");

        assertFalse(result.isPresent());

    }

    @Test
    public void testObtenerPorToda(){

        List<SolicitudDeIntercambio> testList = new ArrayList<>();
        testList.add(solicitudDelIntercambio1);
        testList.add(solicitudDelIntercambio2);
        testList.add(solicitudDelIntercambio3);

        when(repo.findAll()).thenReturn(testList);
        List<SolicitudDeIntercambio> result = service.obtenerTodas();
        assertTrue(result.containsAll(testList));

        verify(repo, times(1)).findAll();
    }

    @Test
    public void testObtenerPorTodasListaVacia(){

        List<SolicitudDeIntercambio> testList = new ArrayList<>();

        when(repo.findAll()).thenReturn(testList);

        List<SolicitudDeIntercambio> result = service.obtenerTodas();
        assertTrue(result.isEmpty());

        verify(repo, times(1)).findAll();
    }

    @Test
    public void actualizarSolicitudExistente(){

        when(repo.existsById("sol-1")).thenReturn(true);
        when(repo.save(any(SolicitudDeIntercambio.class))).thenAnswer(i -> i.getArgument(0)); // return what get saved

        Optional<SolicitudDeIntercambio> result = service.actualizar("sol-1", solicitudDelIntercambio2);

        assertTrue(result.isPresent());
        assertEquals("sol-1", result.get().getId());
        assertNull(result.get().getFiguritasOfrecidas());


    }

    @Test
    public void actualizarSolicitudNoExistente(){

        when(repo.existsById("sol-100")).thenReturn(false);

        Optional<SolicitudDeIntercambio> result = service.actualizar("sol-100", solicitudDelIntercambio2);
        assertFalse(result.isPresent());

    }

    @Test
    public void eliminarSolicitudExistente(){
        when(repo.existsById("sol-1")).thenReturn(true);
        // deleteById is void, no need to mock the return

        boolean result = service.eliminar("sol-1");

        assertTrue(result);
        verify(repo).deleteById("sol-1");  // ← Verify it was called
    }

    @Test
    public void eliminarSolicitudNoExistente(){
        when(repo.existsById("sol-1")).thenReturn(false);
        boolean result = service.eliminar("sol-1");
        assertFalse(result);
        verify(repo, never()).deleteById("sol-1");
    }

    @Test
    public void obtenerRecibidas(){


        List<SolicitudDeIntercambio> testList = new ArrayList<>();
        testList.add(solicitudDelIntercambio3);

        when(repo.findByFiguritaOwnerId("user-2")).thenReturn(testList);
        List<SolicitudDeIntercambio> result = service.obtenerRecibidas("user-2");

        assertTrue(result.containsAll(testList));
        verify(repo, times(1)).findByFiguritaOwnerId("user-2");

    }

    @Test
    public void obtenerRecibidasVacia(){
        List<SolicitudDeIntercambio> testList = new ArrayList<>();

        when(repo.findByFiguritaOwnerId("user-1")).thenReturn(testList);

        List<SolicitudDeIntercambio> result = service.obtenerRecibidas("user-1");
        assertTrue(result.isEmpty());

    }

    @Test
    public void obtenerEnviadas(){

        /*
        public List<SolicitudDeIntercambio> obtenerEnviadas(String usuarioId) {
        return repository.findByUsuarioId(usuarioId);
        }
        }*/
        List<SolicitudDeIntercambio> testList = new ArrayList<>();
        testList.add(solicitudDelIntercambio1);
        testList.add(solicitudDelIntercambio2);

        when(repo.findByUsuarioId("user-1")).thenReturn(testList);
        List<SolicitudDeIntercambio> result = service.obtenerEnviadas("user-1");

        assertTrue(result.containsAll(testList));
        verify(repo, times(1)).findByUsuarioId("user-1");

    }

    @Test
    public void obtenerEnviadasVacia(){
        List<SolicitudDeIntercambio> testList = new ArrayList<>();

        when(repo.findByUsuarioId("user-1")).thenReturn(testList);

        List<SolicitudDeIntercambio> result = service.obtenerEnviadas("user-1");
        assertTrue(result.isEmpty());

    }

    @Test
    public void aceptarSolicitudNotificarProposer(){



        when(repo.findById("sol-1")).thenReturn(Optional.of(solicitudDelIntercambio1));
        when(repo.save(any(SolicitudDeIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        // Mock figurita transfers
        when(figuritaService.transferir("fig-2", figuritaOwner))
                .thenReturn(Optional.of(figurita2));  // proposer's figurita → owner
        when(figuritaService.transferir("fig-1", proposer))
                .thenReturn(Optional.of(figurita));   // owner's figurita → proposer

        Optional<SolicitudDeIntercambio> result = service.aceptar("sol-1");

        assertTrue(result.isPresent());
        assertEquals(ACEPTADO, result.get().getEstado());

        // Verify figurita transfers happened
        verify(figuritaService).transferir("fig-2", figuritaOwner);  // offered figurita
        verify(figuritaService).transferir("fig-1", proposer);       // requested figurita

        // Verify intercambio was created
        ArgumentCaptor<Intercambio> intercambioCaptor = ArgumentCaptor.forClass(Intercambio.class);
        verify(intercambioService).crear(intercambioCaptor.capture());

        Intercambio intercambio = intercambioCaptor.getValue();
        assertEquals(proposer.getId(), intercambio.getUsuarioGenerador().getId());
        assertEquals(figuritaOwner.getId(), intercambio.getUsuarioIntercambiador().getId());

        // Verify notification sent to proposer
        ArgumentCaptor<Notificacion> notifCaptor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService).crear(notifCaptor.capture());
        assertEquals(proposer.getId(), notifCaptor.getValue().getUsuario().getId());

        /*when(repo.findById("sol-1")).thenReturn(Optional.of(solicitudDelIntercambio1));
        when(repo.save(any(SolicitudDeIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        Optional<SolicitudDeIntercambio> result = service.aceptar("sol-1");

        assertTrue(result.isPresent());
        assertEquals("sol-1", result.get().getId());
        assertEquals(ACEPTADO, result.get().getEstado());
        verify(repo, times(1)).findById("sol-1");


        ArgumentCaptor<Notificacion> notifCaptor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService).crear(notifCaptor.capture());

        ArgumentCaptor<SolicitudDeIntercambio> captor = ArgumentCaptor.forClass(SolicitudDeIntercambio.class);
        verify(repo).save(captor.capture());
        assertEquals(ACEPTADO, captor.getValue().getEstado());

        Notificacion notif = notifCaptor.getValue();
        assertEquals(proposer.getId(), notif.getUsuario().getId());
        assertEquals("propuesta", notif.getTipo());
        assertTrue(notif.getTitulo().contains("aceptada"));*/

    }

    @Test
    public void aceptarSolicitudTransferirFallsThrowsException(){
        when(repo.findById("sol-1")).thenReturn(Optional.of(solicitudDelIntercambio1));
        when(repo.save(any(SolicitudDeIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        // Mock transfer failure
        when(figuritaService.transferir("fig-2", figuritaOwner))
                .thenReturn(Optional.empty());  // Transfer fails!

        assertThrows(RuntimeException.class, () -> service.aceptar("sol-1"));

        // Verify intercambio was NOT created
        verify(intercambioService, never()).crear(any());

        // Verify notification was NOT sent
        verify(notificacionService, never()).crear(any());
    }

    @Test
    public void aceptarSolicitudNoExistente(){
        when(repo.findById("sol-999")).thenReturn(Optional.empty());

        Optional<SolicitudDeIntercambio> result = service.aceptar("sol-999");

        assertFalse(result.isPresent());
        verify(repo, never()).save(any());
        verify(figuritaService, never()).transferir(any(), any());
        verify(intercambioService, never()).crear(any());
        verify(notificacionService, never()).crear(any());
    }


    @Test
    public void rechazarSolicitudNotificarProposer(){


        when(repo.findById("sol-1")).thenReturn(Optional.of(solicitudDelIntercambio1));
        when(repo.save(any(SolicitudDeIntercambio.class))).thenAnswer(i -> i.getArgument(0));

        Optional<SolicitudDeIntercambio> result = service.rechazar("sol-1");

        assertTrue(result.isPresent());
        assertEquals(RECHAZADO, result.get().getEstado());

        // Rechazar should NOT transfer figuritas
        verify(figuritaService, never()).transferir(any(), any());
        verify(intercambioService, never()).crear(any());

        // But SHOULD notify
        ArgumentCaptor<Notificacion> notifCaptor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService).crear(notifCaptor.capture());
        assertEquals(proposer.getId(), notifCaptor.getValue().getUsuario().getId());

    }


    @Test
    public void rechazarSolicitudNoExistente(){

        when(repo.findById("sol-999")).thenReturn(Optional.empty());

        Optional<SolicitudDeIntercambio> result = service.rechazar("sol-999");

        assertFalse(result.isPresent());
        verify(repo, never()).save(any());
        verify(notificacionService, never()).crear(any());
    }

    
}
