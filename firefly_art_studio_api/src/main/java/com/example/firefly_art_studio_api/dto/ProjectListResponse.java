package com.example.firefly_art_studio_api.dto;

import java.util.UUID;

public record ProjectListResponse(
    UUID id,
    String name,
    Long untitledNo,
    String description
){}