package com.shop.app.review;

import com.shop.app.auth.UserPrincipal;
import com.shop.app.common.NotFoundException;
import com.shop.app.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviews;
    private final UserRepository users;

    public record ReviewDto(UUID id, String userName, int stars, String comment, OffsetDateTime createdAt) {}
    public record ReviewBody(@Min(1) @Max(5) int stars, @NotBlank String comment) {}

    @GetMapping("/products/{productId}/reviews")
    public List<ReviewDto> list(@PathVariable UUID productId) {
        return reviews.findAllByProductIdOrderByCreatedAtDesc(productId).stream()
                .map(r -> new ReviewDto(
                        r.getId(),
                        users.findById(r.getUserId()).map(u -> u.getName()).orElse("User"),
                        r.getStars(), r.getComment(), r.getCreatedAt()))
                .toList();
    }

    @PostMapping("/products/{productId}/reviews")
    public ReviewDto create(@AuthenticationPrincipal UserPrincipal me,
                            @PathVariable UUID productId,
                            @Valid @RequestBody ReviewBody body) {
        var existing = reviews.findByUserIdAndProductId(me.id(), productId).orElse(null);
        Review r;
        if (existing != null) {
            existing.setStars(body.stars());
            existing.setComment(body.comment());
            r = reviews.save(existing);
        } else {
            r = reviews.save(Review.builder()
                    .userId(me.id())
                    .productId(productId)
                    .stars(body.stars())
                    .comment(body.comment())
                    .build());
        }
        var userName = users.findById(me.id()).map(u -> u.getName()).orElse("User");
        return new ReviewDto(r.getId(), userName, r.getStars(), r.getComment(), r.getCreatedAt());
    }
}
