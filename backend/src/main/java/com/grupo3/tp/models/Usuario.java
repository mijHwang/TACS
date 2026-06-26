package com.grupo3.tp.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Document(collection = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario implements UserDetails {
    @Id
    private String id;
    private String username;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;


    private String email;
    private Role role;
    @DocumentReference(lazy = true)
    private List<Figurita> figuritas;
    @DocumentReference(lazy = true)
    private List<Subasta> subastasFavoritas;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Role effectiveRole = (role != null) ? role : Role.USER;
        return List.of(new SimpleGrantedAuthority("ROLE_" + effectiveRole.name()));
    }

    public Usuario(String username, String password, String email) {
        this.email = email;
        this.username = username;
        this.password = password;
        this.role = Role.USER;
        this.subastasFavoritas = new ArrayList<>();
        this.figuritas = new ArrayList<>();
    }

    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
