package com.shop.app.config;

import com.shop.app.auth.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);
        var src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(c -> c.disable())
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public reads
                .requestMatchers(HttpMethod.GET, "/categories", "/products", "/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/products/*/reviews").permitAll()
                .requestMatchers(HttpMethod.GET, "/combos", "/combos/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/banners", "/banners/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/settings").permitAll()
                // Auth endpoints
                .requestMatchers("/auth/**").permitAll()
                // Health
                .requestMatchers("/actuator/**", "/health").permitAll()
                // Admin management (creating / deleting admins) — SUPER_ADMIN only.
                // More-specific rule must come before /admin/**.
                .requestMatchers("/admin/admins/**").hasRole("SUPER_ADMIN")
                // All other admin endpoints — either ADMIN or SUPER_ADMIN.
                // Controllers additionally re-check the role against a fresh DB
                // read via SecurityService (defense in depth against stale JWTs).
                .requestMatchers("/admin/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                // Everything else needs auth
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
