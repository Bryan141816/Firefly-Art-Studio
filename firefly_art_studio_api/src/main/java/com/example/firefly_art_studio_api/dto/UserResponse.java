package com.example.firefly_art_studio_api.dto;

import java.util.UUID;

public record UserResponse(
    UUID id,
    String email,
    String name,
    String picture
) {
}
