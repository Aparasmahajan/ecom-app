package com.shop.app.common;

import com.shop.app.auth.UserPrincipal;
import com.shop.app.user.User;
import com.shop.app.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Referenced from {@code @PreAuthorize("@sec.isAdmin(authentication)")}
 * on admin controllers.
 *
 * <p>Each check hits the DB to verify the user's <b>current</b> role and
 * enabled status — a JWT issued while the user had ADMIN role does not keep
 * granting admin access if the SUPER_ADMIN later demotes or disables them.
 * The URL rules in {@link com.shop.app.config.SecurityConfig} are a fast
 * first-line gate; this bean is the authoritative second gate.</p>
 */
@Component("sec")
@RequiredArgsConstructor
public class SecurityService {

    static final String ADMIN = "ADMIN";
    static final String SUPER_ADMIN = "SUPER_ADMIN";

    private final UserRepository users;

    /** True if the current principal is an enabled ADMIN or SUPER_ADMIN. */
    public boolean isAdmin(Authentication authentication) {
        return currentUser(authentication)
                .map(u -> ADMIN.equals(u.getRole()) || SUPER_ADMIN.equals(u.getRole()))
                .orElse(false);
    }

    /** True only for the enabled SUPER_ADMIN. */
    public boolean isSuperAdmin(Authentication authentication) {
        return currentUser(authentication)
                .map(u -> SUPER_ADMIN.equals(u.getRole()))
                .orElse(false);
    }

    private Optional<User> currentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal p)) {
            return Optional.empty();
        }
        return users.findById(p.id()).filter(User::isEnabled);
    }
}
