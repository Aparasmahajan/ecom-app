package com.shop.app.order;

import com.shop.app.auth.UserPrincipal;
import com.shop.app.common.BadRequestException;
import com.shop.app.common.NotFoundException;
import com.shop.app.order.OrderDtos.CreateOrderBody;
import com.shop.app.order.OrderDtos.OrderDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService service;
    private final OrderRepository repo;

    @PostMapping
    public OrderDto create(@AuthenticationPrincipal UserPrincipal me,
                           @Valid @RequestBody CreateOrderBody body) {
        return OrderDto.of(service.create(me.id(), body));
    }

    @GetMapping
    public List<OrderDto> list(@AuthenticationPrincipal UserPrincipal me) {
        return repo.findAllByUserIdOrderByCreatedAtDesc(me.id())
                .stream().map(OrderDto::of).toList();
    }

    @GetMapping("/{id}")
    public OrderDto get(@AuthenticationPrincipal UserPrincipal me, @PathVariable UUID id) {
        var o = repo.findById(id).orElseThrow(() -> new NotFoundException("order"));
        if (!o.getUserId().equals(me.id())) throw new BadRequestException("not your order");
        return OrderDto.of(o);
    }
}
