package com.cartadigital.backend.service;

import com.cartadigital.backend.entity.Staff;
import com.cartadigital.backend.exception.ConflictException;
import com.cartadigital.backend.exception.ResourceNotFoundException;
import com.cartadigital.backend.repository.StaffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class StaffService {

    private final StaffRepository repository;

    public StaffService(StaffRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Staff> findAll() {
        return repository.findAllByOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public Staff findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Personal", id));
    }

    public Staff create(Staff staff) {
        if (repository.existsByUsername(staff.getUsername())) {
            throw new ConflictException("El usuario '" + staff.getUsername() + "' ya está registrado");
        }
        staff.setId(null);
        return repository.save(staff);
    }

    public Staff update(Long id, Staff data) {
        Staff current = findById(id);
        if (repository.existsByUsernameAndIdNot(data.getUsername(), id)) {
            throw new ConflictException("El usuario '" + data.getUsername() + "' ya está registrado");
        }
        current.setName(data.getName());
        current.setUsername(data.getUsername());
        current.setRole(data.getRole());
        current.setRoleTitle(data.getRoleTitle());
        current.setStatus(data.getStatus());
        current.setStation(data.getStation());
        return repository.save(current);
    }

    public void delete(Long id) {
        repository.delete(findById(id));
    }
}
