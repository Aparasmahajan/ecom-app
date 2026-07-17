package com.shop.app.auth;

import com.shop.app.user.MeController.UserDto;
import com.shop.app.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService service;

    public record OtpRequest(@Email @NotBlank String email) {}
    public record OtpVerify(@Email @NotBlank String email, @NotBlank @Size(min = 6, max = 6) String otp) {}
    public record AdminLogin(@Email @NotBlank String username, @NotBlank String password) {}
    public record Register(@Email @NotBlank String email, @NotBlank @Size(min = 8) String password,
                           @NotBlank String name, String phone) {}
    public record Login(@Email @NotBlank String email, @NotBlank String password) {}
    public record ForgotPassword(@Email @NotBlank String email) {}
    public record ResetPassword(@Email @NotBlank String email, @NotBlank @Size(min = 6, max = 6) String otp,
                                @NotBlank @Size(min = 8) String newPassword) {}
    public record LoginResponse(String token, UserDto user) {
        static LoginResponse of(String tok, User u) {
            return new LoginResponse(tok,
                    new UserDto(u.getId(), u.getEmail(), u.getName(), u.getPhone(), u.getRole()));
        }
    }

    @PostMapping("/otp/request")
    public ResponseEntity<Map<String, String>> requestOtp(@Valid @RequestBody OtpRequest body) {
        service.requestOtp(body.email());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/otp/verify")
    public LoginResponse verifyOtp(@Valid @RequestBody OtpVerify body) {
        var r = service.verifyOtp(body.email(), body.otp());
        return LoginResponse.of(r.token(), r.user());
    }

    @PostMapping("/admin/login")
    public LoginResponse adminLogin(@Valid @RequestBody AdminLogin body) {
        var r = service.adminLogin(body.username(), body.password());
        return LoginResponse.of(r.token(), r.user());
    }

    @PostMapping("/register")
    public LoginResponse register(@Valid @RequestBody Register body) {
        var r = service.register(body.email(), body.password(), body.name(), body.phone());
        return LoginResponse.of(r.token(), r.user());
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody Login body) {
        var r = service.login(body.email(), body.password());
        return LoginResponse.of(r.token(), r.user());
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPassword body) {
        service.requestPasswordReset(body.email());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPassword body) {
        service.resetPassword(body.email(), body.otp(), body.newPassword());
        return ResponseEntity.ok(Map.of("status", "reset"));
    }
}
