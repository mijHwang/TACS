package com.grupo3.tp.service;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FiguritaRepository;
import com.grupo3.tp.repository.IntercambioRepository;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
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

    public SolicitudDeIntercambioService(SolicitudDeIntercambioRepository repository,
                                         NotificacionService notificacion,
                                         FiguritaService figuritaService,
                                         IntercambioService intercambioService) {
        this.notificacionService = notificacion;
        this.repository = repository;
        this.figuritaService = figuritaService;
        this.intercambioService = intercambioService;

    }

    public SolicitudDeIntercambio crear(SolicitudDeIntercambio solicitud) {

        SolicitudDeIntercambio saved = repository.save(solicitud);

        solicitud.setEstado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE);
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
        return repository.findByFiguritaOwnerId(usuarioId);
    }

    public List<SolicitudDeIntercambio> obtenerEnviadas(String usuarioId) {
        return repository.findByUsuarioId(usuarioId);
    }

    public Optional<SolicitudDeIntercambio> aceptar(String id) {
        Optional<SolicitudDeIntercambio> solicitud = repository.findById(id);



        if (solicitud.isPresent()) {

            SolicitudDeIntercambio aux = solicitud.get();
            aux.setEstado(SolicitudDeIntercambio.EstadoSolicitud.ACEPTADO);
            repository.save(aux);


            Usuario owner = aux.getFigurita().getOwner();

            //petitioner to owner
            for(Figurita b: aux.getFiguritasOfrecidas()){
                Optional<Figurita> result = figuritaService.transferir(b.getId(), owner);
                if (result.isEmpty()) {
                    throw new RuntimeException("Failed to transfer figurita: " + b.getId());
                }
            }
            //owner to petitioner
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
                            .solicitud(aux).
                            build();

            intercambioService.crear(intAux);

            Notificacion notif = Notificacion.builder()
                    .usuario(solicitud.get().getUsuario())
                    .tipo("propuesta")
                    .titulo("propuesta aceptada")
                    .mensaje(owner.getUsername() + " acepto tu propuesta")
                    .enlace("/propuestas/enviadas")
                    .leida(false)
                    .fecha(LocalDateTime.now())
                    .build();

            notificacionService.crear(notif);


        }


        return solicitud;
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



}
