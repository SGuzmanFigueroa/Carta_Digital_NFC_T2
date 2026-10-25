package com.cartadigital.backend.service;

import com.cartadigital.backend.model.Category;
import com.cartadigital.backend.exception.ConflictException;
import com.cartadigital.backend.exception.ResourceNotFoundException;
import com.cartadigital.backend.repository.CategoryRepository;
import com.cartadigital.backend.repository.DishRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository repository;
    private final DishRepository dishRepository;

    public CategoryService(CategoryRepository repository, DishRepository dishRepository) {
        this.repository = repository;
        this.dishRepository = dishRepository;
    }

    @Transactional(readOnly = true)
    public List<Category> findAll() {
        return repository.findAllByOrderBySortOrderAscNameAsc();
    }

    @Transactional(readOnly = true)
    public Category findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Categoría", id));
    }

    public Category create(Category category) {
        if (repository.existsByNameIgnoreCase(category.getName().trim())) {
            throw new ConflictException("Ya existe una categoría llamada '" + category.getName() + "'");
        }
        category.setId(null);
        category.setName(category.getName().trim());
        return repository.save(category);
    }

    public Category update(Long id, Category data) {
        Category current = findById(id);
        if (repository.existsByNameIgnoreCaseAndIdNot(data.getName().trim(), id)) {
            throw new ConflictException("Ya existe una categoría llamada '" + data.getName() + "'");
        }
        current.setName(data.getName().trim());
        current.setSortOrder(data.getSortOrder());
        current.setActive(data.getActive());
        return repository.save(current);
    }

    public void delete(Long id) {
        Category category = findById(id);
        if (dishRepository.existsByCategoryId(id)) {
            throw new ConflictException("No se puede eliminar: la categoría tiene platos asociados");
        }
        repository.delete(category);
    }
}
