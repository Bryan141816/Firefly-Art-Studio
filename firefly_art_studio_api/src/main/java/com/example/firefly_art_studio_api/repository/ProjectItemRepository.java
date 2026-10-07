package com.example.firefly_art_studio_api.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.firefly_art_studio_api.model.Project;
import com.example.firefly_art_studio_api.model.ProjectItem;

public interface ProjectItemRepository extends JpaRepository<ProjectItem, UUID> {
    List<ProjectItem> findByProject(Project project);

    List<ProjectItem> findByIdIn(List<UUID> ids);
}
