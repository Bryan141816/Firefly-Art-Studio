package com.example.firefly_art_studio_api.dto;

import java.util.Map;

public class ProjectViewResponse {
    private ProjectResponse project_metadata;
    private Map<String, CanvasObject> items;

    public ProjectViewResponse(
            ProjectResponse project_metadata,
            Map<String, CanvasObject> items
    ) {
        this.project_metadata = project_metadata;
        this.items = items;
    }

    public ProjectResponse getProject_metadata() {
        return project_metadata;
    }

    public Map<String, CanvasObject> getItems() {
        return items;
    }
}
