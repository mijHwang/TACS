package com.grupo3.tp.dtos.catalogo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogoJson(String torneo, List<String> categorias, List<SeleccionJson> selecciones) {}
