package com.cartadigital.backend.repository;

import com.cartadigital.backend.model.Dish;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DishRepository extends JpaRepository<Dish, Long> {
    List<Dish> findAllByOrderByNameAsc();
    List<Dish> findByCategoryIdOrderByNameAsc(Long categoryId);
    boolean existsByCategoryId(Long categoryId);
}
