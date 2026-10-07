package com.example.firefly_art_studio_api.dto;

import java.util.UUID;

public class CreateProjectItemRequest {

    private UUID canvasId;

    private Double x;
    private Double y;

    private Double width;
    private Double height;

    private Double rotation;

    private Boolean active;

    public UUID getCanvasId() {
        return canvasId;
    }

    public void setCanvasId(UUID canvasId) {
        this.canvasId = canvasId;
    }

    public Double getX() {
        return x;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public Double getY() {
        return y;
    }

    public void setY(Double y) {
        this.y = y;
    }

    public Double getWidth() {
        return width;
    }

    public void setWidth(Double width) {
        this.width = width;
    }

    public Double getHeight() {
        return height;
    }

    public void setHeight(Double height) {
        this.height = height;
    }

    public Double getRotation() {
        return rotation;
    }

    public void setRotation(Double rotation) {
        this.rotation = rotation;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}