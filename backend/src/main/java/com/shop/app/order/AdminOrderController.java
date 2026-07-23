package com.shop.app.order;

import com.shop.app.common.BadRequestException;
import com.shop.app.common.NotFoundException;
import com.shop.app.order.OrderDtos.AdminOrderDto;
import com.shop.app.order.OrderDtos.CancelBody;
import com.shop.app.order.OrderDtos.NotesBody;
import com.shop.app.order.OrderDtos.TrackingBody;
import com.shop.app.order.OrderDtos.UpdateStatusBody;
import com.shop.app.user.User;
import com.shop.app.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Full admin surface for order fulfilment.
 *
 * <p>Every method is protected by:
 * <ul>
 *   <li>URL rule in SecurityConfig ({@code /admin/**} → ADMIN or SUPER_ADMIN)</li>
 *   <li>Class-level {@code @PreAuthorize} that re-checks role from a fresh DB
 *       read (so a revoked admin's JWT is useless immediately).</li>
 * </ul>
 */
@RestController
@RequestMapping("/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("@sec.isAdmin(authentication)")
public class AdminOrderController {

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "CREATED", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"
    );

    private final OrderRepository orders;
    private final UserRepository users;

    // ---------- List ----------
    /**
     * Return every order in the system, newest first, enriched with the
     * customer's name / email so the admin table can show it without a
     * per-row round trip.
     */
    @GetMapping
    public List<AdminOrderDto> list() {
        var all = orders.findAllByOrderByCreatedAtDesc();
        var userIds = all.stream().map(Order::getUserId).distinct().toList();
        var userMap = users.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return all.stream()
                .map(o -> AdminOrderDto.of(o, userMap.get(o.getUserId())))
                .toList();
    }

    @GetMapping("/{id}")
    public AdminOrderDto get(@PathVariable UUID id) {
        var o = orders.findById(id).orElseThrow(() -> new NotFoundException("order"));
        var u = users.findById(o.getUserId()).orElse(null);
        return AdminOrderDto.of(o, u);
    }

    // ---------- Status ----------
    /**
     * Move an order along the fulfilment pipeline.
     * Accepts: CREATED, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED.
     */
    @PutMapping("/{id}/status")
    public AdminOrderDto setStatus(@PathVariable UUID id, @Valid @RequestBody UpdateStatusBody body) {
        if (!ALLOWED_STATUSES.contains(body.status())) {
            throw new BadRequestException("invalid status: " + body.status());
        }
        var o = orders.findById(id).orElseThrow(() -> new NotFoundException("order"));
        o.setStatus(body.status());
        // If we're marking a refund, mirror the payment side too.
        if ("REFUNDED".equals(body.status())) {
            o.setPaymentStatus("REFUNDED");
        }
        return AdminOrderDto.of(orders.save(o), users.findById(o.getUserId()).orElse(null));
    }

    // ---------- Tracking ----------
    /** Attach or update the courier tracking number (visible to the customer). */
    @PutMapping("/{id}/tracking")
    public AdminOrderDto setTracking(@PathVariable UUID id, @RequestBody TrackingBody body) {
        var o = orders.findById(id).orElseThrow(() -> new NotFoundException("order"));
        var tn = body.trackingNumber();
        o.setTrackingNumber(tn == null || tn.isBlank() ? null : tn.trim());
        // Convenience: if admin adds a tracking number and status is still
        // PROCESSING or earlier, auto-advance to SHIPPED.
        if (o.getTrackingNumber() != null &&
            List.of("CREATED", "PAID", "PROCESSING").contains(o.getStatus())) {
            o.setStatus("SHIPPED");
        }
        return AdminOrderDto.of(orders.save(o), users.findById(o.getUserId()).orElse(null));
    }

    // ---------- Notes ----------
    /** Private admin notes — never surfaced to the customer. */
    @PutMapping("/{id}/notes")
    public AdminOrderDto setNotes(@PathVariable UUID id, @RequestBody NotesBody body) {
        var o = orders.findById(id).orElseThrow(() -> new NotFoundException("order"));
        o.setAdminNotes(body.notes() == null ? "" : body.notes());
        return AdminOrderDto.of(orders.save(o), users.findById(o.getUserId()).orElse(null));
    }

    // ---------- Cancel / Refund shortcuts ----------
    /** Cancel an order and record a customer-visible reason. */
    @PutMapping("/{id}/cancel")
    public AdminOrderDto cancel(@PathVariable UUID id, @RequestBody CancelBody body) {
        var o = orders.findById(id).orElseThrow(() -> new NotFoundException("order"));
        if ("DELIVERED".equals(o.getStatus())) {
            throw new BadRequestException("delivered orders cannot be cancelled — refund instead");
        }
        o.setStatus("CANCELLED");
        o.setCancelReason(body.reason() == null ? null : body.reason().trim());
        return AdminOrderDto.of(orders.save(o), users.findById(o.getUserId()).orElse(null));
    }

    @PutMapping("/{id}/refund")
    public AdminOrderDto refund(@PathVariable UUID id, @RequestBody CancelBody body) {
        var o = orders.findById(id).orElseThrow(() -> new NotFoundException("order"));
        if (!"PAID".equals(o.getPaymentStatus())) {
            throw new BadRequestException("only PAID orders can be refunded");
        }
        o.setStatus("REFUNDED");
        o.setPaymentStatus("REFUNDED");
        o.setCancelReason(body.reason() == null ? null : body.reason().trim());
        return AdminOrderDto.of(orders.save(o), users.findById(o.getUserId()).orElse(null));
    }
}
