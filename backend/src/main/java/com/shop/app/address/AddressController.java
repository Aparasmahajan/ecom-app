package com.shop.app.address;

import com.shop.app.auth.UserPrincipal;
import com.shop.app.common.BadRequestException;
import com.shop.app.common.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/me/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressRepository repo;

    public record AddressDto(UUID id, String fullName, String phone, String line1, String line2,
                             String city, String state, String pincode, boolean isDefault) {
        static AddressDto of(Address a) {
            return new AddressDto(a.getId(), a.getFullName(), a.getPhone(), a.getLine1(), a.getLine2(),
                    a.getCity(), a.getState(), a.getPincode(), a.isDefault());
        }
    }

    public record AddressBody(
            @NotBlank String fullName,
            @Pattern(regexp = "\\d{10}", message = "must be 10 digits") String phone,
            @NotBlank String line1,
            String line2,
            @NotBlank String city,
            @NotBlank String state,
            @Pattern(regexp = "\\d{6}", message = "must be 6 digits") String pincode,
            Boolean isDefault
    ) {}

    @GetMapping
    public List<AddressDto> list(@AuthenticationPrincipal UserPrincipal me) {
        return repo.findAllByUserIdOrderByIsDefaultDescCreatedAtDesc(me.id())
                .stream().map(AddressDto::of).toList();
    }

    @PostMapping
    @Transactional
    public AddressDto create(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody AddressBody body) {
        boolean makeDefault = Boolean.TRUE.equals(body.isDefault())
                || repo.findAllByUserIdOrderByIsDefaultDescCreatedAtDesc(me.id()).isEmpty();
        if (makeDefault) repo.clearDefaults(me.id());
        var a = Address.builder()
                .userId(me.id())
                .fullName(body.fullName())
                .phone(body.phone())
                .line1(body.line1())
                .line2(body.line2())
                .city(body.city())
                .state(body.state())
                .pincode(body.pincode())
                .isDefault(makeDefault)
                .build();
        return AddressDto.of(repo.save(a));
    }

    @PutMapping("/{id}")
    @Transactional
    public AddressDto update(@AuthenticationPrincipal UserPrincipal me, @PathVariable UUID id,
                             @Valid @RequestBody AddressBody body) {
        var a = ownedOrThrow(me, id);
        a.setFullName(body.fullName());
        a.setPhone(body.phone());
        a.setLine1(body.line1());
        a.setLine2(body.line2());
        a.setCity(body.city());
        a.setState(body.state());
        a.setPincode(body.pincode());
        if (Boolean.TRUE.equals(body.isDefault()) && !a.isDefault()) {
            repo.clearDefaults(me.id());
            a.setDefault(true);
        }
        return AddressDto.of(repo.save(a));
    }

    @PutMapping("/{id}/default")
    @Transactional
    public AddressDto makeDefault(@AuthenticationPrincipal UserPrincipal me, @PathVariable UUID id) {
        var a = ownedOrThrow(me, id);
        repo.clearDefaults(me.id());
        a.setDefault(true);
        return AddressDto.of(repo.save(a));
    }

    @DeleteMapping("/{id}")
    public void delete(@AuthenticationPrincipal UserPrincipal me, @PathVariable UUID id) {
        var a = ownedOrThrow(me, id);
        repo.delete(a);
    }

    private Address ownedOrThrow(UserPrincipal me, UUID id) {
        var a = repo.findById(id).orElseThrow(() -> new NotFoundException("address"));
        if (!a.getUserId().equals(me.id())) throw new BadRequestException("not your address");
        return a;
    }
}
