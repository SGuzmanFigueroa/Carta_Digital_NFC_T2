package com.cartadigital.backend.service;

import com.cartadigital.backend.model.Category;
import com.cartadigital.backend.model.Dish;
import com.cartadigital.backend.exception.ConflictException;
import com.cartadigital.backend.exception.ResourceNotFoundException;
import com.cartadigital.backend.repository.DishRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class DishService {

    private final DishRepository repository;
    private final CategoryService categoryService;

    public DishService(DishRepository repository, CategoryService categoryService) {
        this.repository = repository;
        this.categoryService = categoryService;
    }

    @Transactional(readOnly = true)
    public List<Dish> findAll(Long categoryId) {
        return categoryId == null
                ? repository.findAllByOrderByNameAsc()
                : repository.findByCategoryIdOrderByNameAsc(categoryId);
    }

    @Transactional(readOnly = true)
    public Dish findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Plato", id));
    }

    public Dish create(Dish dish) {
        dish.setId(null);
        dish.setCategory(resolveCategory(dish));
        return repository.save(dish);
    }

    public Dish update(Long id, Dish data) {
        Dish current = findById(id);
        current.setName(data.getName());
        current.setDescription(data.getDescription());
        current.setPrice(data.getPrice());
        current.setCategory(resolveCategory(data));
        current.setImage(data.getImage());
        current.setPrepTime(data.getPrepTime());
        current.setDietary(data.getDietary());
        current.setActive(data.getActive());
        return repository.save(current);
    }

    public void delete(Long id) {
        repository.delete(findById(id));
    }

    /** El cliente solo envía { category: { id } }; aquí se carga la categoría real. */
    private Category resolveCategory(Dish dish) {
        if (dish.getCategory().getId() == null) {
            throw new ConflictException("Debe indicar el id de la categoría");
        }
        return categoryService.findById(dish.getCategory().getId());
    }
}
