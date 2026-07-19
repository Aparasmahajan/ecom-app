package com.shop.app.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    /** Count how many users hold a given role (used to enforce ADMIN_MAX_COUNT). */
    long countByRole(String role);

    /** List all users whose role is one of the given values, newest first. */
    List<User> findAllByRoleInOrderByCreatedAtDesc(List<String> roles);
}
