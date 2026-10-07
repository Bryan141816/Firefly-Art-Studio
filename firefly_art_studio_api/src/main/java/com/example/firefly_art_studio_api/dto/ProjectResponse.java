package com.example.firefly_art_studio_api.dto;

import java.util.Map;

public class ProjectResponse {
    private ProjectListResponse project_metadata;
    private Map<String, CanvasObject> items;

    public ProjectResponse(
            ProjectListResponse project_metadata,
            Map<String, CanvasObject> items
    ) {
        this.project_metadata = project_metadata;
        this.items = items;
    }

    public ProjectListResponse getProject_metadata() {
        return project_metadata;
    }

    public Map<String, CanvasObject> getItems() {
        return items;
    }
}
