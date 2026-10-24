package com.cartadigital.backend.controller;

import com.cartadigital.backend.entity.RestaurantTable;
import com.cartadigital.backend.service.RestaurantTableService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
public class RestaurantTableController {

    private final RestaurantTableService service;

    public RestaurantTableController(RestaurantTableService service) {
        this.service = service;
    }

    @GetMapping
    public List<RestaurantTable> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public RestaurantTable get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RestaurantTable create(@Valid @RequestBody RestaurantTable table) {
        return service.create(table);
    }

    @PutMapping("/{id}")
    public RestaurantTable update(@PathVariable Long id, @Valid @RequestBody RestaurantTable table) {
        return service.update(id, table);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
