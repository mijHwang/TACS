package com.grupo3.tp.service;

import com.grupo3.tp.models.Notificacion;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.NotificacionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificacionServiceTest {

    @Mock
    private NotificacionRepository repo;

    @InjectMocks
    private NotificacionService service;

    private Usuario usuario1;
    private Usuario usuario2;
    private Notificacion notif1;
    private Notificacion notif2;
    private Notificacion notif3;

    @BeforeEach
    public void setUp() {
        usuario1 = Usuario.builder()
                .id("user-1")
                .username("juan")
                .email("juan@example.com")
                .build();

        usuario2 = Usuario.builder()
                .id("user-2")
                .username("maria")
                .email("maria@example.com")
                .build();

        notif1 = Notificacion.builder()
                .id("notif-1")
                .usuario(usuario1)
                .tipo("propuesta")
                .titulo("Nueva propuesta")
                .mensaje("Te enviaron una propuesta")
                .enlace("/propuestas/recibidas")
                .leida(false)
                .fecha(LocalDateTime.now())
                .build();

        notif2 = Notificacion.builder()
                .id("notif-2")
                .usuario(usuario1)
                .tipo("propuesta")
                .titulo("Propuesta aceptada")
                .mensaje("Tu propuesta fue aceptada")
                .enlace("/propuestas/enviadas")
                .leida(false)
                .fecha(LocalDateTime.now())
                .build();

        notif3 = Notificacion.builder()
                .id("notif-3")
                .usuario(usuario2)
                .tipo("propuesta")
                .titulo("Nueva propuesta")
                .mensaje("Te enviaron una propuesta")
                .enlace("/propuestas/recibidas")
                .leida(false)
                .fecha(LocalDateTime.now())
                .build();
    }

    // ============= CREAR TESTS =============
    @Test
    public void testCrearNotificacion() {
        when(repo.save(any(Notificacion.class))).thenReturn(notif1);

        Notificacion result = service.crear(notif1);

        assertNotNull(result);
        assertEquals("notif-1", result.getId());
        assertEquals("juan", result.getUsuario().getUsername());

        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(repo).save(captor.capture());
        assertEquals("propuesta", captor.getValue().getTipo());
        assertFalse(captor.getValue().getLeida());
    }

    @Test
    public void testCrearNotificacionThrowsException() {
        when(repo.save(any(Notificacion.class)))
                .thenThrow(new RuntimeException("Database error"));

        assertThrows(RuntimeException.class, () -> service.crear(notif1));
        verify(repo, times(1)).save(any(Notificacion.class));
    }

    // ============= OBTENER POR ID TESTS =============
    @Test
    public void testObtenerPorIdExistente() {
        when(repo.findById("notif-1")).thenReturn(Optional.of(notif1));

        Optional<Notificacion> result = service.obtenerPorId("notif-1");

        assertTrue(result.isPresent());
        assertEquals("notif-1", result.get().getId());
        assertEquals("juan", result.get().getUsuario().getUsername());
        verify(repo, times(1)).findById("notif-1");
    }

    @Test
    public void testObtenerPorIdNoExistente() {
        when(repo.findById("notif-999")).thenReturn(Optional.empty());

        Optional<Notificacion> result = service.obtenerPorId("notif-999");

        assertFalse(result.isPresent());
        verify(repo, times(1)).findById("notif-999");
    }

    // ============= OBTENER TODAS TESTS =============
    @Test
    public void testObtenerTodas() {
        List<Notificacion> testList = new ArrayList<>();
        testList.add(notif1);
        testList.add(notif2);
        testList.add(notif3);

        when(repo.findAll()).thenReturn(testList);

        List<Notificacion> result = service.obtenerTodas();

        assertTrue(result.containsAll(testList));
        assertEquals(3, result.size());
        verify(repo, times(1)).findAll();
    }

    @Test
    public void testObtenerTodasListaVacia() {
        List<Notificacion> testList = new ArrayList<>();

        when(repo.findAll()).thenReturn(testList);

        List<Notificacion> result = service.obtenerTodas();

        assertTrue(result.isEmpty());
        verify(repo, times(1)).findAll();
    }

    // ============= OBTENER POR USUARIO TESTS =============
    @Test
    public void testObtenerPorUsuarioExistente() {
        List<Notificacion> testList = new ArrayList<>();
        testList.add(notif1);
        testList.add(notif2);

        when(repo.findByUsuarioId("user-1")).thenReturn(testList);

        List<Notificacion> result = service.obtenerPorUsuario("user-1");

        assertTrue(result.containsAll(testList));
        assertEquals(2, result.size());
        verify(repo, times(1)).findByUsuarioId("user-1");
    }

    @Test
    public void testObtenerPorUsuarioVacia() {
        List<Notificacion> testList = new ArrayList<>();

        when(repo.findByUsuarioId("user-999")).thenReturn(testList);

        List<Notificacion> result = service.obtenerPorUsuario("user-999");

        assertTrue(result.isEmpty());
        verify(repo, times(1)).findByUsuarioId("user-999");
    }

    // ============= OBTENER POR USUARIO (PAGINADO) TESTS =============
    @Test
    public void testObtenerPorUsuarioPaginado() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Notificacion> pagina = new PageImpl<>(List.of(notif1, notif2), pageable, 2);

        when(repo.findByUsuarioId(eq("user-1"), any(Pageable.class))).thenReturn(pagina);

        Page<Notificacion> result = service.obtenerPorUsuario("user-1", pageable);

        assertEquals(2, result.getContent().size());
        assertEquals("notif-1", result.getContent().get(0).getId());
        assertEquals(2, result.getTotalElements());
        assertEquals(1, result.getTotalPages());
        assertTrue(result.isLast());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repo, times(1)).findByUsuarioId(eq("user-1"), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(10, captor.getValue().getPageSize());
    }

    @Test
    public void testObtenerPorUsuarioPaginadoVacia() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Notificacion> pagina = new PageImpl<>(new ArrayList<>(), pageable, 0);

        when(repo.findByUsuarioId(eq("user-999"), any(Pageable.class))).thenReturn(pagina);

        Page<Notificacion> result = service.obtenerPorUsuario("user-999", pageable);

        assertTrue(result.getContent().isEmpty());
        assertEquals(0, result.getTotalElements());
        verify(repo, times(1)).findByUsuarioId(eq("user-999"), any(Pageable.class));
    }

    // ============= MARCAR COMO LEIDA TESTS =============
    @Test
    public void testMarcarComoLeidaExistente() {


        when(repo.findById("notif-1")).thenReturn(Optional.of(notif1));
        when(repo.save(any(Notificacion.class))).thenAnswer(i -> i.getArgument(0));

        Optional<Notificacion> result = service.marcarComoLeida("notif-1");

        assertTrue(result.isPresent());

        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(repo).save(captor.capture());
        assertTrue(captor.getValue().getLeida());
        assertEquals("notif-1", captor.getValue().getId());
    }

    @Test
    public void testMarcarComoLeidaNoExistente() {
        when(repo.findById("notif-999")).thenReturn(Optional.empty());

        Optional<Notificacion> result = service.marcarComoLeida("notif-999");

        assertFalse(result.isPresent());
        verify(repo, never()).save(any());
    }

    // ============= ELIMINAR TESTS =============
    @Test
    public void testEliminarExistente() {
        when(repo.existsById("notif-1")).thenReturn(true);

        boolean result = service.eliminar("notif-1");

        assertTrue(result);
        verify(repo).deleteById("notif-1");
    }

    @Test
    public void testEliminarNoExistente() {
        when(repo.existsById("notif-999")).thenReturn(false);

        boolean result = service.eliminar("notif-999");

        assertFalse(result);
        verify(repo, never()).deleteById(any());
    }

    // ============= NOTIFICAR USUARIOS FALTANTES - SUBASTA =============
    @Test
    public void testNotificarUsuariosFaltantesSubastaExcluyeCreadorYGuardaEnLote() {
        // usuario1 (user-1) es el creador de la subasta: sólo usuario2 debe recibir la notificación.
        service.notificarUsuariosFaltantesSubasta(
                List.of(usuario1, usuario2), "Messi", "user-1", "sub-99");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Notificacion>> captor = ArgumentCaptor.forClass(List.class);
        verify(repo, times(1)).saveAll(captor.capture());
        verify(repo, never()).save(any());

        List<Notificacion> guardadas = captor.getValue();
        assertEquals(1, guardadas.size());
        Notificacion n = guardadas.get(0);
        assertEquals("user-2", n.getUsuario().getId());
        assertEquals("subasta", n.getTipo());
        assertEquals("/subastas/sub-99", n.getEnlace());
        assertFalse(n.getLeida());
        assertTrue(n.getMensaje().contains("Messi"));
    }

    @Test
    public void testNotificarUsuariosFaltantesSubastaSinInteresadosNoGuarda() {
        // Sólo el creador está en la lista → no queda nadie a quién notificar.
        service.notificarUsuariosFaltantesSubasta(
                List.of(usuario1), "Messi", "user-1", "sub-99");

        verify(repo, never()).saveAll(any());
        verify(repo, never()).save(any());
    }

    // ============= NOTIFICAR USUARIOS FALTANTES - PUBLICACION =============
    @Test
    public void testNotificarUsuariosFaltantesPublicacionExcluyePublicador() {
        // usuario1 (user-1) es el publicador: sólo usuario2 debe recibir la notificación.
        service.notificarUsuariosFaltantes(
                List.of(usuario1, usuario2), "Messi", "user-1");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Notificacion>> captor = ArgumentCaptor.forClass(List.class);
        verify(repo, times(1)).saveAll(captor.capture());

        List<Notificacion> guardadas = captor.getValue();
        assertEquals(1, guardadas.size());
        Notificacion n = guardadas.get(0);
        assertEquals("user-2", n.getUsuario().getId());
        assertEquals("publicacion", n.getTipo());
        assertFalse(n.getLeida());
        assertTrue(n.getMensaje().contains("Messi"));
    }
}