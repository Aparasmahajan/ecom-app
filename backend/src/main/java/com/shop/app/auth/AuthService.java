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
        generateAndSendOtp(rawEmail.trim().toLowerCase());
    }

    /**
     * Verify OTP, upsert user (auto-signup on first OTP), issue JWT.
     */
    @Transactional
    public LoginResult verifyOtp(String rawEmail, String otp) {
        var email = rawEmail.trim().toLowerCase();
        consumeOtp(email, otp);

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
     * Register a new USER with an email + password. Unlike OTP login, this does
     * NOT auto-create on the fly — a duplicate email is rejected so each address
     * is registered exactly once. Auto-logs-in on success (returns a JWT).
     */
    @Transactional
    public LoginResult register(String rawEmail, String password, String name, String phone) {
        var email = rawEmail.trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("email already registered");
        }
        var user = users.save(User.builder()
                .email(email)
                .name(name.trim())
                .phone(phone == null || phone.isBlank() ? null : phone.trim())
                .role("USER")
                .enabled(true)
                .passwordHash(encoder.encode(password))
                .build());
        var jwtStr = jwt.issue(user.getId(), user.getEmail(), user.getRole());
        return new LoginResult(jwtStr, user);
    }

    /**
     * Email + password login for any enabled user that has a password set.
     * The email must already be registered; unregistered emails, accounts with
     * no password (OTP-only signups), disabled accounts, and wrong passwords
     * all fail with the same generic "invalid credentials" (no user enumeration).
     */
    public LoginResult login(String rawEmail, String password) {
        var email = rawEmail.trim().toLowerCase();
        var user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("invalid credentials"));
        if (!user.isEnabled()) throw new BadCredentialsException("account disabled");
        if (user.getPasswordHash() == null || !encoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("invalid credentials");
        }
        var jwtStr = jwt.issue(user.getId(), user.getEmail(), user.getRole());
        return new LoginResult(jwtStr, user);
    }

    /**
     * Forgot-password step 1: send a reset OTP — but only to a registered email.
     * Reuses the OTP token infrastructure used by passwordless login.
     */
    @Transactional
    public void requestPasswordReset(String rawEmail) {
        var email = rawEmail.trim().toLowerCase();
        if (!users.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("email not registered");
        }
        generateAndSendOtp(email);
    }

    /**
     * Forgot-password step 2: verify the OTP and set a new password.
     */
    @Transactional
    public void resetPassword(String rawEmail, String otp, String newPassword) {
        var email = rawEmail.trim().toLowerCase();
        var user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadRequestException("email not registered"));
        consumeOtp(email, otp);
        user.setPasswordHash(encoder.encode(newPassword));
        users.save(user);
    }

    /** Generate a 6-digit OTP, hash + persist it, and send it (dev: logs it). */
    private void generateAndSendOtp(String email) {
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
     * Validate the latest OTP for an email and mark it used. Throws
     * {@link BadRequestException} on any failure (missing / expired / already
     * used / too many attempts / mismatch). Shared by OTP login and password reset.
     */
    private void consumeOtp(String email, String otp) {
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
