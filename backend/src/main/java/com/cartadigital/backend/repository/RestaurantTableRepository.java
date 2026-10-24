package com.cartadigital.backend.repository;

import com.cartadigital.backend.entity.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, Long> {
    List<RestaurantTable> findAllByOrderByNumberAsc();
    boolean existsByNumberIgnoreCase(String number);
    boolean existsByNumberIgnoreCaseAndIdNot(String number, Long id);
}
