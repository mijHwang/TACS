package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ReputacionResponseDTO {
    private double score;
    private int total;
    private int cincoEstrellas;
    private int cuatroEstrellas;
    private int tresEstrellas;
    private int dosEstrellas;
    private int unaEstrella;
}