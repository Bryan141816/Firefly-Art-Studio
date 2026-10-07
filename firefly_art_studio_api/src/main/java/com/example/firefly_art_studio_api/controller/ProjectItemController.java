package com.example.firefly_art_studio_api.controller;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.example.firefly_art_studio_api.dto.CanvasObject;
import com.example.firefly_art_studio_api.dto.CreateProjectItemRequest;
import com.example.firefly_art_studio_api.model.Project;
import com.example.firefly_art_studio_api.model.ProjectItem;
import com.example.firefly_art_studio_api.model.User;
import com.example.firefly_art_studio_api.repository.ProjectItemRepository;
import com.example.firefly_art_studio_api.repository.ProjectRepository;
import com.example.firefly_art_studio_api.repository.UserRepository;
import com.example.firefly_art_studio_api.service.FileStorageService;

@RestController
@RequestMapping("/api")
public class ProjectItemController {
    private final ProjectRepository projectRepository;
    private final ProjectItemRepository projectItemRepository;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;

    public ProjectItemController(
            ProjectRepository projectRepository,
            ProjectItemRepository projectItemRepository,
            FileStorageService fileStorageService,
            UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.projectItemRepository = projectItemRepository;
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/project/{projectId}/item/", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createProjectItems(
            @PathVariable UUID projectId,
            @RequestPart("data") List<CreateProjectItemRequest> data,
            @RequestPart("files") List<MultipartFile> files,
            Authentication authentication) {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String googleId = oauthUser.getAttribute("sub");

        User user = userRepository.findByGoogleId(googleId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository
                .findByIdAndUser(projectId, user)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Project not found"));

        if (data.size() != files.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Number of data items must match number of files");
        }

        List<ProjectItem> items = new ArrayList<>();

        try {

            for (int i = 0; i < data.size(); i++) {

                CreateProjectItemRequest request = data.get(i);
                MultipartFile file = files.get(i);

                if (file.isEmpty()) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "File at index " + i + " is empty");
                }

                String src = fileStorageService.save(file);

                ProjectItem item = new ProjectItem(
                        request.getCanvasId(),
                        src,
                        request.getX(),
                        request.getY(),
                        request.getWidth(),
                        request.getHeight(),
                        request.getRotation(),
                        request.getActive(),
                        project);

                items.add(item);
            }

            projectItemRepository.saveAll(items);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(items);

        } catch (IOException e) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to save uploaded files",
                    e);
        }
    }

    @PatchMapping(value = "/project/item/", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateProjectItems(
            @RequestBody Map<String, CanvasObject> items) {

        List<UUID> ids = items.keySet()
                .stream()
                .map(UUID::fromString)
                .toList();

        List<ProjectItem> projectItems = projectItemRepository.findByIdIn(ids);

        Map<UUID, ProjectItem> existingItems = projectItems.stream()
                .collect(Collectors.toMap(
                        ProjectItem::getId,
                        item -> item));

        for (Map.Entry<String, CanvasObject> entry : items.entrySet()) {

            UUID id = UUID.fromString(entry.getKey());
            CanvasObject data = entry.getValue();

            ProjectItem item = existingItems.get(id);

            if (item == null) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Project item not found: " + id);
            }

            item.setX(data.getX());
            item.setY(data.getY());
            item.setWidth(data.getWidth());
            item.setHeight(data.getHeight());
            item.setRotation(data.getRotation());
            item.setActive(data.isActive());
        }

        projectItemRepository.saveAll(projectItems);

        return ResponseEntity.ok().build();
    }

}
