package com.grupo3.tp.service;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.grupo3.tp.dtos.OfertaDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.NotificacionRepository;
import com.grupo3.tp.repository.OfertaRepository;
import com.grupo3.tp.repository.SubastaRepository;
import com.grupo3.tp.dtos.SubastaDTO;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DocumentReference;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class OfertaService {

    private final OfertaRepository repository;
    private final SubastaRepository subastaRepository;
    private final NotificacionService notificacionService;
    private final UsuarioService usuarioService;
    private final FiguritaService figuritaService;

    public OfertaService(OfertaRepository repository,
                         SubastaRepository subastaRepository,
                         NotificacionService notificacionService,
                         UsuarioService usuarioService,
                         FiguritaService figuritaService) {
        this.repository = repository;
        this.subastaRepository = subastaRepository;
        this.notificacionService = notificacionService;
        this.usuarioService = usuarioService;
        this.figuritaService = figuritaService;
    }

    public Oferta crear(OfertaDTO ofertaDTO, SubastaDTO subastaDTO) {

        Optional<Subasta> subastaOpt = subastaRepository.findById(subastaDTO.getSubastaId());
        if (!subastaOpt.isPresent()) {
            throw new RuntimeException("Subasta not found");
        }
        Subasta subasta = subastaOpt.get();

        Usuario usuario = usuarioService.obtenerPorId(ofertaDTO.getUsuarioId())
                .orElseThrow(() -> new RuntimeException("Usuario not found"));


        List<Figurita> figuritas = ofertaDTO.getFiguritaIds().stream()
                .map(id -> figuritaService.obtenerPorId(id)
                        .orElseThrow(() -> new RuntimeException("Figurita " + id + " not found")))
                .collect(Collectors.toList());


        Oferta oferta = Oferta.builder()
                .usuario(usuario)
                .figuritas(figuritas)
                .estado(Estado.PENDIENTE)  // Default state
                .fechaOferta(LocalDateTime.now())
                .build();

        // 5. Save the oferta
        Oferta ofertaGuardada = repository.save(oferta);


        // Check if user already has a bid on this auction
        Optional<Oferta> ofertaExistente = repository.findAll().stream()
                .filter(o -> o.getUsuario().getId().equals(ofertaDTO.getUsuarioId())
                        && subasta.getOfertas().contains(o))
                .findFirst();

        // If exists, remove old one
        if (ofertaExistente.isPresent()) {
            subasta.getOfertas().remove(ofertaExistente.get());
            repository.delete(ofertaExistente.get());
        }

        // 6. Add to subasta's list// for the time we just add the new one not replace or update
        subasta.getOfertas().add(ofertaGuardada);
        subastaRepository.save(subasta);

            Notificacion notif = Notificacion.builder()
                    .usuario(subasta.getUsuario())
                    .tipo("subasta")
                    .titulo("nueva oferta")
                    .mensaje(ofertaDTO.getUsuarioId() + " te manda una nueva oferta.")
                    .enlace("/subastas/" + subastaDTO.getSubastaId())
                    .leida(false)
                    .fecha(LocalDateTime.now())
                    .build();

            notificacionService.crear(notif);


        return repository.save(oferta);
    }

    public Optional<Oferta> obtenerPorId(String id) {
        return repository.findById(id);
    }

    public List<Oferta> obtenerTodas() {
        return repository.findAll();
    }

    public Optional<Oferta> actualizar(String id, Oferta oferta) {
        if (!repository.existsById(id)) {
            return Optional.empty();
        }
        oferta.setId(id);
        return Optional.of(repository.save(oferta));
    }

    public boolean eliminar(String id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }
}
