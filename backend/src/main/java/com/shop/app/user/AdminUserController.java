package com.shop.app.user;

import com.shop.app.auth.UserPrincipal;
import com.shop.app.common.BadRequestException;
import com.shop.app.common.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * SUPER_ADMIN-only management of admin accounts.
 *
 * <p>Rules enforced here:
 * <ul>
 *   <li>Only SUPER_ADMIN can call any endpoint on this controller (Spring
 *       Security URL rule + {@code @PreAuthorize} on the class).</li>
 *   <li>At most {@code app.admin.max-count} ADMIN accounts may exist (regular
 *       admins only — the SUPER_ADMIN doesn't count toward this).</li>
 *   <li>Nobody can delete or demote the SUPER_ADMIN. The SUPER_ADMIN also
 *       can't delete themselves via this API.</li>
 * </ul>
 */
@RestController
@RequestMapping("/admin/admins")
@RequiredArgsConstructor
@PreAuthorize("@sec.isSuperAdmin(authentication)")
public class AdminUserController {

    private static final String ADMIN = "ADMIN";
    private static final String SUPER_ADMIN = "SUPER_ADMIN";

    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Value("${app.admin.max-count:3}")
    private int adminMaxCount;

    public record AdminDto(
            UUID id, String email, String name, String phone, String role,
            boolean enabled, OffsetDateTime createdAt
    ) {
        static AdminDto of(User u) {
            return new AdminDto(u.getId(), u.getEmail(), u.getName(), u.getPhone(),
                    u.getRole(), u.isEnabled(), u.getCreatedAt());
        }
    }

    public record CreateAdminBody(
            @Email @NotBlank String email,
            @NotBlank String name,
            @NotBlank @Size(min = 8, message = "at least 8 characters") String password,
            String phone
    ) {}

    public record ResetPasswordBody(
            @NotBlank @Size(min = 8) String password
    ) {}

    public record EnabledBody(boolean enabled) {}

    @GetMapping
    public List<AdminDto> list() {
        return users.findAllByRoleInOrderByCreatedAtDesc(List.of(ADMIN, SUPER_ADMIN))
                .stream().map(AdminDto::of).toList();
    }

    @PostMapping
    public AdminDto create(@Valid @RequestBody CreateAdminBody body) {
        var currentAdmins = users.countByRole(ADMIN);
        if (currentAdmins >= adminMaxCount) {
            throw new BadRequestException(
                "admin limit reached (" + adminMaxCount + ") — delete one before adding another"
            );
        }
        var normEmail = body.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(normEmail)) {
            throw new BadRequestException("email already in use");
        }
        var admin = User.builder()
                .email(normEmail)
                .name(body.name().trim())
                .phone(body.phone() == null ? null : body.phone().trim())
                .role(ADMIN)
                .enabled(true)
                .passwordHash(encoder.encode(body.password()))
                .build();
        return AdminDto.of(users.save(admin));
    }

    @PutMapping("/{id}/password")
    public AdminDto resetPassword(@PathVariable UUID id, @Valid @RequestBody ResetPasswordBody body) {
        var admin = adminOrThrow(id);
        admin.setPasswordHash(encoder.encode(body.password()));
        return AdminDto.of(users.save(admin));
    }

    @PutMapping("/{id}/enabled")
    public AdminDto setEnabled(@AuthenticationPrincipal UserPrincipal me,
                               @PathVariable UUID id,
                               @Valid @RequestBody EnabledBody body) {
        var admin = adminOrThrow(id);
        if (SUPER_ADMIN.equals(admin.getRole())) {
            throw new BadRequestException("cannot disable the SUPER_ADMIN");
        }
        if (admin.getId().equals(me.id())) {
            throw new BadRequestException("cannot disable your own account");
        }
        admin.setEnabled(body.enabled());
        return AdminDto.of(users.save(admin));
    }

    @DeleteMapping("/{id}")
    public void delete(@AuthenticationPrincipal UserPrincipal me, @PathVariable UUID id) {
        var admin = adminOrThrow(id);
        if (SUPER_ADMIN.equals(admin.getRole())) {
            throw new BadRequestException("cannot delete the SUPER_ADMIN");
        }
        if (admin.getId().equals(me.id())) {
            throw new BadRequestException("cannot delete your own account");
        }
        users.delete(admin);
    }

    /** Fetch an admin/super_admin by id; 404 for anyone else. */
    private User adminOrThrow(UUID id) {
        var u = users.findById(id).orElseThrow(() -> new NotFoundException("admin"));
        if (!ADMIN.equals(u.getRole()) && !SUPER_ADMIN.equals(u.getRole())) {
            throw new NotFoundException("admin");
        }
        return u;
    }
}
