package com.grupo3.tp.dtos;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FiguritaRequestDTO {
    private String figuritaBaseId;
    private String ownerId;
}
