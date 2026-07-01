package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/** Resumen devuelto por el seed de demo (US8/visualización). Datos de display, no de negocio. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DemoSeedResultDTO {
    private int usuarios;
    private int figuritasBase;
    private int figuritas;
    private int figuritasPublicadas;
    private int solicitudes;
    private int intercambios;
    private int subastas;
    private int ofertas;
    private int sugerencias;
    private int notificaciones;
    private int calificaciones;
    private List<ProtagonistaDTO> protagonistas;
    private String protagonistaUsername;
    private String protagonistaPassword;
    private String adminUsername;
    private String adminPassword;
    private String mensaje;
}
