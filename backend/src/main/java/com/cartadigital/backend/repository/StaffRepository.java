package com.cartadigital.backend.repository;

import com.cartadigital.backend.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StaffRepository extends JpaRepository<Staff, Long> {
    List<Staff> findAllByOrderByNameAsc();
    boolean existsByUsername(String username);
    boolean existsByUsernameAndIdNot(String username, Long id);
}
