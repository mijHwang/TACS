package com.grupo3.tp.dtos.catalogo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JugadorJson(String nombre, String club, String categoria, String imagenUrl) {}
