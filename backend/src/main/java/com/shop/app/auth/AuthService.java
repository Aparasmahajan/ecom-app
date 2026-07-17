package com.shop.app.auth;

import com.shop.app.common.BadRequestException;
import com.shop.app.integrations.BrevoEmailService;
import com.shop.app.user.User;
import com.shop.app.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository users;
    private final OtpTokenRepository otpRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final BrevoEmailService email;

    @Value("${app.otp.ttl-minutes:10}") private long otpTtlMinutes;
    @Value("${app.otp.max-attempts:5}") private int otpMaxAttempts;

    private static final SecureRandom RNG = new SecureRandom();

    /** Generate a 6-digit OTP, hash + persist it, send via Brevo. */
    @Transactional
    public void requestOtp(String rawEmail) {
        var email = rawEmail.trim().toLowerCase();
        var otp = String.format("%06d", RNG.nextInt(1_000_000));
        var token = OtpToken.builder()
                .email(email)
                .otpHash(encoder.encode(otp))
                .expiresAt(OffsetDateTime.now().plusMinutes(otpTtlMinutes))
                .build();
        otpRepo.save(token);

        // In dev (no Brevo key), the OTP is logged so devs can copy it.
        this.email.sendOtp(email, otp);
    }

    /**
     * Verify OTP, upsert user (auto-signup on first OTP), issue JWT.
     */
    @Transactional
    public LoginResult verifyOtp(String rawEmail, String otp) {
        var email = rawEmail.trim().toLowerCase();
        var token = otpRepo.findFirstByEmailIgnoreCaseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BadRequestException("no otp requested"));

        if (token.isVerified()) throw new BadRequestException("otp already used");
        if (token.getExpiresAt().isBefore(OffsetDateTime.now())) throw new BadRequestException("otp expired");
        if (token.getAttempts() >= otpMaxAttempts) throw new BadRequestException("too many attempts");

        token.setAttempts(token.getAttempts() + 1);
        if (!encoder.matches(otp, token.getOtpHash())) {
            otpRepo.save(token);
            throw new BadRequestException("invalid otp");
        }
        token.setVerified(true);
        otpRepo.save(token);

        var user = users.findByEmailIgnoreCase(email).orElseGet(() -> {
            var atIdx = email.indexOf('@');
            var defaultName = atIdx > 0 ? email.substring(0, Math.min(atIdx, 32)) : "User";
            return users.save(User.builder()
                    .email(email)
                    .name(defaultName)
                    .role("USER")
                    .enabled(true)
                    .build());
        });

        var jwtStr = jwt.issue(user.getId(), user.getEmail(), user.getRole());
        return new LoginResult(jwtStr, user);
    }

    /**
     * Admin / super-admin login uses email + password (no OTP).
     * Accepts either ADMIN or SUPER_ADMIN roles.
     */
    public LoginResult adminLogin(String rawEmail, String password) {
        var email = rawEmail.trim().toLowerCase();
        var user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("invalid credentials"));
        if (!user.isEnabled()) throw new BadCredentialsException("account disabled");
        var role = user.getRole();
        if (!"ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
            throw new BadCredentialsException("not an admin");
        }
        if (user.getPasswordHash() == null || !encoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("invalid credentials");
        }
        var jwtStr = jwt.issue(user.getId(), user.getEmail(), role);
        return new LoginResult(jwtStr, user);
    }

    public record LoginResult(String token, User user) {}
}
