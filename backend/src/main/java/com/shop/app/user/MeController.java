package com.shop.app.user;

import com.shop.app.auth.UserPrincipal;
import com.shop.app.common.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository users;

    public record UserDto(UUID id, String email, String name, String phone, String role) {
        static UserDto of(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getName(), u.getPhone(), u.getRole());
        }
    }

    public record UpdateMe(String name, String phone) {}

    @GetMapping
    public UserDto me(@AuthenticationPrincipal UserPrincipal me) {
        var u = users.findById(me.id()).orElseThrow(() -> new NotFoundException("user"));
        return UserDto.of(u);
    }

    @PutMapping
    public UserDto update(@AuthenticationPrincipal UserPrincipal me, @RequestBody UpdateMe body) {
        var u = users.findById(me.id()).orElseThrow(() -> new NotFoundException("user"));
        if (body.name() != null && !body.name().isBlank()) u.setName(body.name().trim());
        if (body.phone() != null) u.setPhone(body.phone().trim());
        return UserDto.of(users.save(u));
    }
}
