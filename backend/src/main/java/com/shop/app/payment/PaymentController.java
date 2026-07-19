package com.shop.app.payment;

import com.shop.app.order.OrderDtos.OrderDto;
import com.shop.app.order.OrderDtos.PaymentVerifyBody;
import com.shop.app.order.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final OrderService orders;

    @PostMapping("/verify")
    public OrderDto verify(@Valid @RequestBody PaymentVerifyBody body) {
        var o = orders.markPaid(body.razorpayOrderId(), body.razorpayPaymentId(), body.signature());
        return OrderDto.of(o);
    }
}
