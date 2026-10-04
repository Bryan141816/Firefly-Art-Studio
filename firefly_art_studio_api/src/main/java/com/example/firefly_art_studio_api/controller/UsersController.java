package com.example.firefly_art_studio_api.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.firefly_art_studio_api.dto.UserResponse;
import com.example.firefly_art_studio_api.model.User;
import com.example.firefly_art_studio_api.repository.UserRepository;

@RestController
@RequestMapping("/api")
public class UsersController {

    private final UserRepository userRepository;

    public UsersController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {

        OAuth2User oauthUser =
                (OAuth2User) authentication.getPrincipal();

        String googleId = oauthUser.getAttribute("sub");

        User user = userRepository.findByGoogleId(googleId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getProfilePictureUrl()
        );
    }
}