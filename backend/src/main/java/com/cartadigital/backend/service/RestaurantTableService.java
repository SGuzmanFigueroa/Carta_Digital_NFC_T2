package com.cartadigital.backend.service;

import com.cartadigital.backend.model.RestaurantTable;
import com.cartadigital.backend.exception.ConflictException;
import com.cartadigital.backend.exception.ResourceNotFoundException;
import com.cartadigital.backend.repository.RestaurantTableRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class RestaurantTableService {

    private final RestaurantTableRepository repository;

    public RestaurantTableService(RestaurantTableRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<RestaurantTable> findAll() {
        return repository.findAllByOrderByNumberAsc();
    }

    @Transactional(readOnly = true)
    public RestaurantTable findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Mesa", id));
    }

    public RestaurantTable create(RestaurantTable table) {
        if (repository.existsByNumberIgnoreCase(table.getNumber().trim())) {
            throw new ConflictException("Ya existe la mesa " + table.getNumber());
        }
        table.setId(null);
        table.setNumber(table.getNumber().trim());
        return repository.save(table);
    }

    public RestaurantTable update(Long id, RestaurantTable data) {
        RestaurantTable current = findById(id);
        if (repository.existsByNumberIgnoreCaseAndIdNot(data.getNumber().trim(), id)) {
            throw new ConflictException("Ya existe la mesa " + data.getNumber());
        }
        current.setNumber(data.getNumber().trim());
        current.setCapacity(data.getCapacity());
        current.setZone(data.getZone());
        current.setStatus(data.getStatus());
        return repository.save(current);
    }

    public void delete(Long id) {
        repository.delete(findById(id));
    }
}
