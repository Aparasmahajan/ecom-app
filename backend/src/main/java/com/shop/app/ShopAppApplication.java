package com.shop.app;

import com.shop.app.user.User;
import com.shop.app.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@RequiredArgsConstructor
@Slf4j
public class ShopAppApplication {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Value("${app.admin.super-username}") private String superUsername;
    @Value("${app.admin.super-password}") private String superPassword;

    public static void main(String[] args) {
        SpringApplication.run(ShopAppApplication.class, args);
    }

    /**
     * Seed the SUPER_ADMIN account on first boot. Idempotent — if it already
     * exists we do nothing (so you can rotate the password via SQL / an admin
     * endpoint later without the seed overwriting it).
     *
     * Regular ADMIN accounts are NOT seeded — the SUPER_ADMIN creates them
     * via POST /admin/admins after logging in.
     */
    @Bean
    CommandLineRunner seedSuperAdmin() {
        return args -> {
            if (users.findByEmailIgnoreCase(superUsername).isEmpty()) {
                var superAdmin = User.builder()
                        .email(superUsername.toLowerCase())
                        .name("Super Admin")
                        .role("SUPER_ADMIN")
                        .enabled(true)
                        .passwordHash(encoder.encode(superPassword))
                        .build();
                users.save(superAdmin);
                log.info("Seeded SUPER_ADMIN account: {}", superUsername);
            } else {
                log.info("SUPER_ADMIN {} already present — skipping seed", superUsername);
            }
        };
    }
}
