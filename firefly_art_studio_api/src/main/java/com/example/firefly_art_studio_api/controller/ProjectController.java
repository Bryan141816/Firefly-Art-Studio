package com.example.firefly_art_studio_api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.firefly_art_studio_api.dto.CreateProjectRequest;
import com.example.firefly_art_studio_api.dto.ProjectResponse;
import com.example.firefly_art_studio_api.model.Project;
import com.example.firefly_art_studio_api.model.User;
import com.example.firefly_art_studio_api.repository.ProjectRepository;
import com.example.firefly_art_studio_api.repository.UserRepository;


@RestController 
@RequestMapping("/api")
public class ProjectController {
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    public ProjectController(UserRepository userRepository, ProjectRepository projectRepository){
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
    }

    @GetMapping("/projects")
    public List<ProjectResponse> getAll(Authentication authentication) {
        OAuth2User oauthUser =
                (OAuth2User) authentication.getPrincipal();

        String googleId = oauthUser.getAttribute("sub");

        User user = userRepository.findByGoogleId(googleId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return projectRepository.findByUser(user)
                .stream()
                .map(project -> new ProjectResponse(
                        project.getId(),
                        project.getName(),
                        project.getUntitledNo(),
                        project.getDescription()
                ))
                .toList();
    }

    @PostMapping("/project")
    public ProjectResponse create(
            @RequestBody CreateProjectRequest request,
            Authentication authentication
    ) {
        OAuth2User oauthUser =
                (OAuth2User) authentication.getPrincipal();

        String googleId = oauthUser.getAttribute("sub");

        User user = userRepository.findByGoogleId(googleId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long maxUntitledNo = projectRepository.findMaxUntitledNoByUser(user);
        Long untitledNo = maxUntitledNo + 1;

        Project project = new Project(
                request.getName(),
                request.getDescription(),
                user,
                untitledNo
        );
    
        Project savedProject = projectRepository.save(project);
    
        return new ProjectResponse(
                savedProject.getId(),
                savedProject.getName(),
                savedProject.getUntitledNo(),
                savedProject.getDescription()
        );
    }

    @DeleteMapping("/project/{id}")
    public void delete(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        OAuth2User oauthUser =
                (OAuth2User) authentication.getPrincipal();

        String googleId = oauthUser.getAttribute("sub");

        User user = userRepository.findByGoogleId(googleId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You do not own this project");
        }

        projectRepository.delete(project);
    }
}
