package com.cartadigital.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "staff")
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre admite hasta 100 caracteres")
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank(message = "El usuario es obligatorio")
    @Pattern(regexp = "^[a-z0-9._]{3,40}$", message = "Usuario: 3 a 40 caracteres en minúscula, números, punto o guion bajo")
    @Column(nullable = false, unique = true, length = 40)
    private String username;

    @NotBlank(message = "El rol es obligatorio")
    @Pattern(regexp = "admin|kitchen|floor|bar|runner", message = "Rol inválido")
    @Column(nullable = false, length = 20)
    private String role;

    @Size(max = 60)
    @Column(name = "role_title", length = 60)
    private String roleTitle;

    @NotBlank(message = "El estado es obligatorio")
    @Pattern(regexp = "Activo|Inactivo", message = "Estado inválido")
    @Column(nullable = false, length = 20)
    private String status = "Activo";

    @Size(max = 60)
    @Column(length = 60)
    private String station;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getRoleTitle() { return roleTitle; }
    public void setRoleTitle(String roleTitle) { this.roleTitle = roleTitle; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getStation() { return station; }
    public void setStation(String station) { this.station = station; }
}
