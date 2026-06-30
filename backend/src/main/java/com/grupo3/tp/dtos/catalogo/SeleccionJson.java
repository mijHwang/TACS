package com.grupo3.tp.dtos.catalogo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SeleccionJson(String nombre, String confederacion, List<JugadorJson> jugadores) {}
