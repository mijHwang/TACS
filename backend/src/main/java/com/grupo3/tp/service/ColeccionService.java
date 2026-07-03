package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.Faltante;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.FaltanteRepository;
import com.grupo3.tp.repository.FiguritaPublicadaRepository;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
import com.grupo3.tp.repository.SubastaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * Orquestador del alta self-service de colección (US "construir mi colección"):
 * setear la cantidad de copias poseídas de una base y administrar la wishlist de faltantes.
 * En la Fase A, bajar la cantidad no está soportado (409); la Fase B agrega la cascada.
 */
@Service
public class ColeccionService {

    private final FiguritaService figuritaService;
    private final FiguritaBaseService figuritaBaseService;
    private final UsuarioService usuarioService;
    private final FaltanteRepository faltanteRepository;
    private final FiguritaPublicadaService publicadaService;
    private final SubastaService subastaService;
    private final SolicitudDeIntercambioService solicitudService;
    private final FiguritaPublicadaRepository publicadaRepository;
    private final SubastaRepository subastaRepository;
    private final SolicitudDeIntercambioRepository solicitudRepository;

    public ColeccionService(FiguritaService figuritaService,
                            FiguritaBaseService figuritaBaseService,
                            UsuarioService usuarioService,
                            FaltanteRepository faltanteRepository,
                            FiguritaPublicadaService publicadaService,
                            SubastaService subastaService,
                            SolicitudDeIntercambioService solicitudService,
                            FiguritaPublicadaRepository publicadaRepository,
                            SubastaRepository subastaRepository,
                            SolicitudDeIntercambioRepository solicitudRepository) {
        this.figuritaService = figuritaService;
        this.figuritaBaseService = figuritaBaseService;
        this.usuarioService = usuarioService;
        this.faltanteRepository = faltanteRepository;
        this.publicadaService = publicadaService;
        this.subastaService = subastaService;
        this.solicitudService = solicitudService;
        this.publicadaRepository = publicadaRepository;
        this.subastaRepository = subastaRepository;
        this.solicitudRepository = solicitudRepository;
    }

    /** Copias de {@code baseId} que posee el usuario. */
    private List<Figurita> copiasDe(String userId, String baseId) {
        return figuritaService.obtenerTodasInternaPorUserId(userId).stream()
                .filter(f -> f.getFiguritaBase() != null
                        && baseId.equals(f.getFiguritaBase().getId()))
                .toList();
    }

    /** Deja el total de copias de la base en {@code cantidad} (set). */
    public FiguritaResponseDTO setCantidad(String username, String figuritaBaseId, int cantidad) {
        if (cantidad < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad no puede ser negativa");
        }
        Usuario usuario = usuarioService.loadUserByUsername(username);
        FiguritaBase base = figuritaBaseService.obtenerPorId(figuritaBaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FiguritaBase no encontrada"));

        List<Figurita> mias = copiasDe(usuario.getId(), figuritaBaseId);
        int current = mias.size();

        if (cantidad > current) {
            for (int i = 0; i < cantidad - current; i++) {
                figuritaService.crear(Figurita.builder().figuritaBase(base).owner(usuario).build());
            }
        } else if (cantidad < current) {
            int need = current - cantidad;
            List<Figurita> ordenadas = ordenarPorMenorCompromiso(mias);
            for (int i = 0; i < need; i++) {
                liberarFigurita(ordenadas.get(i).getId());
            }
        }

        String repId = mias.isEmpty() ? null : mias.get(0).getId();
        return new FiguritaResponseDTO(
                repId, base.getNumero(), base.getId(), cantidad,
                base.getJugador().getNombre(), base.getSeleccion().getNombre(),
                base.getEquipo().getNombre(), base.getCategoria().getNombre(),
                usuario.getId(), usuario.getUsername(), base.getImagenUrl());
    }

    /** Agrega una base a la wishlist (idempotente). Rechaza si ya la posee. */
    public void agregarFaltante(String username, String figuritaBaseId) {
        Usuario usuario = usuarioService.loadUserByUsername(username);
        FiguritaBase base = figuritaBaseService.obtenerPorId(figuritaBaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FiguritaBase no encontrada"));

        boolean laPosee = !copiasDe(usuario.getId(), figuritaBaseId).isEmpty();
        if (laPosee) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya tenés esta figurita");
        }
        if (faltanteRepository.existsByUsuarioIdAndFiguritaBaseId(usuario.getId(), figuritaBaseId)) {
            return; // idempotente
        }
        faltanteRepository.save(Faltante.builder()
                .usuarioId(usuario.getId())
                .figuritaBaseId(figuritaBaseId)
                .figuritaBase(base)
                .fecha(LocalDateTime.now())
                .build());
    }

    /** Quita una base de la wishlist. 404 si no estaba. */
    public void quitarFaltante(String username, String figuritaBaseId) {
        Usuario usuario = usuarioService.loadUserByUsername(username);
        long removed = faltanteRepository.deleteByUsuarioIdAndFiguritaBaseId(usuario.getId(), figuritaBaseId);
        if (removed == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La figurita no estaba en faltantes");
        }
    }

    /** Wishlist del usuario, paginada, mapeada a {@link FiguritaBaseDTO}. */
    public Page<FiguritaBaseDTO> listarFaltantes(String username, Pageable pageable) {
        Usuario usuario = usuarioService.loadUserByUsername(username);
        return faltanteRepository.findByUsuarioId(usuario.getId(), pageable)
                .map(f -> {
                    FiguritaBase b = f.getFiguritaBase();
                    return new FiguritaBaseDTO(
                            b.getId(), b.getNumero(), b.getJugador().getNombre(),
                            b.getSeleccion().getNombre(), b.getEquipo().getNombre(),
                            b.getCategoria().getNombre(), b.getImagenUrl());
                });
    }

    /** true si la copia está en alguna publicación, subasta activa o propuesta pendiente. */
    private boolean estaComprometida(String figuritaId) {
        return !publicadaRepository.findByFiguritaId(figuritaId).isEmpty()
                || !subastaRepository.findByFiguritaId(figuritaId).isEmpty()
                || !solicitudRepository.findPendientesByFiguritaId(figuritaId).isEmpty();
    }

    /** Ordena las copias dejando primero las no comprometidas (menor disrupción al liberar). */
    private List<Figurita> ordenarPorMenorCompromiso(List<Figurita> copias) {
        return copias.stream()
                .sorted(Comparator.comparing(f -> estaComprometida(f.getId())))
                .toList();
    }

    /** Desarma todos los compromisos de una copia (publicación/subasta/propuesta) y la borra. */
    public void liberarFigurita(String figuritaId) {
        publicadaService.removeFiguritaFromPublications(figuritaId);
        subastaService.cancelarPorFigurita(figuritaId);
        solicitudService.cancelarPorFigurita(figuritaId);
        figuritaService.eliminar(figuritaId);
    }
}
