package com.example.firefly_art_studio_api.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.firefly_art_studio_api.model.Project;
import com.example.firefly_art_studio_api.model.User;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findByUser(User user);

    @Query("""
        SELECT COALESCE(MAX(p.untitledNo), 0)
        FROM Project p
        WHERE p.user = :user
    """)
    Long findMaxUntitledNoByUser(@Param("user") User user);
}