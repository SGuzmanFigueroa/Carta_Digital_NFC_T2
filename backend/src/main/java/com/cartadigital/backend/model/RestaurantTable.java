package com.cartadigital.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "restaurant_tables")
public class RestaurantTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El número de mesa es obligatorio")
    @Size(max = 10, message = "El número admite hasta 10 caracteres")
    @Column(nullable = false, unique = true, length = 10)
    private String number;

    @NotNull(message = "La capacidad es obligatoria")
    @Min(value = 1, message = "La capacidad mínima es 1")
    @Max(value = 30, message = "La capacidad máxima es 30")
    @Column(nullable = false)
    private Integer capacity = 4;

    @NotBlank(message = "La zona es obligatoria")
    @Pattern(regexp = "salon|terraza|barra|vip", message = "Zona inválida")
    @Column(nullable = false, length = 20)
    private String zone = "salon";

    @NotBlank(message = "El estado es obligatorio")
    @Pattern(regexp = "disponible|ocupada|reservada|mantenimiento", message = "Estado inválido")
    @Column(nullable = false, length = 20)
    private String status = "disponible";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNumber() { return number; }
    public void setNumber(String number) { this.number = number; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
