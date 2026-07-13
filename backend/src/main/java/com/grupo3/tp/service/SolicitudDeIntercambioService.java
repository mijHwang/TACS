package com.grupo3.tp.service;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.transaction.annotation.Transactional;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;


@Service
public class SolicitudDeIntercambioService {

    private final NotificacionService notificacionService;
    private final SolicitudDeIntercambioRepository repository;
    private final FiguritaService figuritaService;
    private final IntercambioService intercambioService;
    private final FiguritaPublicadaService publicadaService;
    private final MongoTemplate mongoTemplate;

    public SolicitudDeIntercambioService(SolicitudDeIntercambioRepository repository,
                                         NotificacionService notificacion,
                                         FiguritaService figuritaService,
                                         IntercambioService intercambioService,
                                         FiguritaPublicadaService publicadaService,
                                         MongoTemplate mongoTemplate) {
        this.notificacionService = notificacion;
        this.repository = repository;
        this.figuritaService = figuritaService;
        this.intercambioService = intercambioService;
        this.publicadaService = publicadaService;
        this.mongoTemplate = mongoTemplate;
    }

    public SolicitudDeIntercambio crear(SolicitudDeIntercambio solicitud) {

        solicitud.setEstado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE);

        SolicitudDeIntercambio saved = repository.save(solicitud);


        Notificacion notif = Notificacion.builder()
                .usuario(solicitud.getFigurita().getOwner())
                .tipo("propuesta")
                .titulo("Nueva propuesta")
                .mensaje(solicitud.getUsuario().getUsername() + " te envió una propuesta")
                .enlace("/propuestas/recibidas")
                .leida(false)
                .fecha(LocalDateTime.now())
                .build();

        notificacionService.crear(notif);

        return saved;


    }

    public Optional<SolicitudDeIntercambio> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public List<SolicitudDeIntercambio> obtenerTodas() {
        return repository.findAll();
    }

    public Optional<SolicitudDeIntercambio> actualizar(String id, SolicitudDeIntercambio solicitud) {
        if (!repository.existsById(id)) {
            return Optional.empty();
        }
        solicitud.setId(id);
        return Optional.of(repository.save(solicitud));
    }

    public boolean eliminar(String id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    public List<SolicitudDeIntercambio> obtenerRecibidas(String usuarioId) {
        List<Figurita> misFiguritas = figuritaService.obtenerTodasInternaPorUserId(usuarioId);
        if (misFiguritas.isEmpty()) return List.of();
        List<String> misFiguritaIds = misFiguritas.stream()
                .map(Figurita::getId)
                .toList();
        return repository.findByFiguritaIds(misFiguritaIds);
    }



    public List<SolicitudDeIntercambio> obtenerEnviadas(String usuarioId) {
        return repository.findByUsuarioId(usuarioId);
    }

    public Page<SolicitudDeIntercambio> obtenerRecibidas(String usuarioId, Pageable pageable) {
        return repository.findByFiguritaOwnerId(usuarioId, pageable);
    }

    public Page<SolicitudDeIntercambio> obtenerEnviadas(String usuarioId, Pageable pageable) {
        return repository.findByUsuarioId(usuarioId, pageable);
    }

    @Transactional
    public Optional<SolicitudDeIntercambio> aceptar(String id) {
        // findAndModify: atomic find + update, only if estado = PENDIENTE
        Query q = new Query(Criteria.where("_id").is(id)
                .and("estado").is(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE));
        Update u = new Update().set("estado", SolicitudDeIntercambio.EstadoSolicitud.ACEPTADO);
        SolicitudDeIntercambio aux = mongoTemplate.findAndModify(
                q, u, FindAndModifyOptions.options().returnNew(true),
                SolicitudDeIntercambio.class
        );

        if (aux == null) {
            // Already accepted, rejected or doesn't exist — reject silently
            return Optional.empty();
        }

        Usuario owner = aux.getFigurita().getOwner();

        // petitioner to owner
        for (Figurita b : aux.getFiguritasOfrecidas()) {
            Optional<Figurita> result = figuritaService.transferir(b.getId(), owner);
            if (result.isEmpty()) {
                throw new RuntimeException("Failed to transfer figurita: " + b.getId());
            }
        }

        // owner to petitioner
        Optional<Figurita> result = figuritaService.transferir(
                aux.getFigurita().getId(),
                aux.getUsuario());
        if (result.isEmpty()) {
            throw new RuntimeException("Failed to transfer figurita: " + aux.getFigurita().getId());
        }

        Intercambio intAux = Intercambio.builder()
                .usuarioGenerador(aux.getUsuario())
                .figurita(aux.getFigurita())
                .figuritaIntercambiada(aux.getFiguritasOfrecidas())
                .usuarioIntercambiador(owner)
                .fecha(LocalDateTime.now())
                .solicitud(aux)
                .build();

        intercambioService.crear(intAux);

        publicadaService.removeFiguritaFromPublications(aux.getFigurita().getId());
        for (Figurita f : aux.getFiguritasOfrecidas()) {
            publicadaService.removeFiguritaFromPublications(f.getId());
        }

        Notificacion notif = Notificacion.builder()
                .usuario(aux.getUsuario())
                .tipo("propuesta")
                .titulo("propuesta aceptada")
                .mensaje(owner.getUsername() + " acepto tu propuesta")
                .enlace("/propuestas/enviadas")
                .leida(false)
                .fecha(LocalDateTime.now())
                .build();

        notificacionService.crear(notif);

        return Optional.of(aux);
    }

    public Optional<SolicitudDeIntercambio> rechazar(String id) {
        Optional<SolicitudDeIntercambio> solicitud = repository.findById(id);
        if (solicitud.isPresent()) {
            solicitud.get().setEstado(SolicitudDeIntercambio.EstadoSolicitud.RECHAZADO);
            repository.save(solicitud.get());



            Notificacion notif = Notificacion.builder()
                    .usuario(solicitud.get().getUsuario())
                    .tipo("propuesta")
                    .titulo("propuesta rechazada")
                    .mensaje(solicitud.get().getFigurita().getOwner().getUsername() + " rechazo tu propuesta")
                    .enlace("/propuestas/enviadas")
                    .leida(false)
                    .fecha(LocalDateTime.now())
                    .build();

            notificacionService.crear(notif);
        }
        return solicitud;
    }

    /** Cancela (soft) las solicitudes PENDIENTES que referencian la figurita y avisa a la contraparte. */
    public void cancelarPorFigurita(String figuritaId) {
        for (SolicitudDeIntercambio sol : repository.findPendientesByFiguritaId(figuritaId)) {
            sol.setEstado(SolicitudDeIntercambio.EstadoSolicitud.CANCELADO);
            repository.save(sol);

            boolean eraPedida = sol.getFigurita() != null && figuritaId.equals(sol.getFigurita().getId());
            Usuario destinatario = eraPedida
                    ? sol.getUsuario()
                    : (sol.getFigurita() != null ? sol.getFigurita().getOwner() : null);
            String enlace = eraPedida ? "/propuestas/enviadas" : "/propuestas/recibidas";

            if (destinatario != null) {
                notificacionService.crear(Notificacion.builder()
                        .usuario(destinatario)
                        .tipo("propuesta")
                        .titulo("Propuesta cancelada")
                        .mensaje("Una propuesta fue cancelada porque una figurita ya no está disponible")
                        .enlace(enlace)
                        .leida(false)
                        .fecha(LocalDateTime.now())
                        .build());
            }
        }
    }

}
