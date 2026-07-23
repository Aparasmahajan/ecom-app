package com.shop.app.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ComboRepository extends JpaRepository<Combo, UUID> {
    List<Combo> findAllByActiveTrueOrderByCreatedAtDesc();
    List<Combo> findAllByOrderByCreatedAtDesc();
}
