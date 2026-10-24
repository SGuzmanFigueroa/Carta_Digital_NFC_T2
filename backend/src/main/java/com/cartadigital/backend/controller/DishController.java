package com.cartadigital.backend.controller;

import com.cartadigital.backend.entity.Dish;
import com.cartadigital.backend.service.DishService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dishes")
public class DishController {

    private final DishService service;

    public DishController(DishService service) {
        this.service = service;
    }

    /** GET /api/dishes o GET /api/dishes?categoryId=1 */
    @GetMapping
    public List<Dish> list(@RequestParam(required = false) Long categoryId) {
        return service.findAll(categoryId);
    }

    @GetMapping("/{id}")
    public Dish get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Dish create(@Valid @RequestBody Dish dish) {
        return service.create(dish);
    }

    @PutMapping("/{id}")
    public Dish update(@PathVariable Long id, @Valid @RequestBody Dish dish) {
        return service.update(id, dish);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
