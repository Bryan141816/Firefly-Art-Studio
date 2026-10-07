package com.example.firefly_art_studio_api.dto;

public class CanvasObject {

    private String assetId;
    private String src;
    private Double x;
    private Double y;
    private Double width;
    private Double height;
    private Double rotation;
    private boolean active;

    public CanvasObject(){}
    
    public CanvasObject(
            String assetId,
            String src,
            Double x,
            Double y,
            Double width,
            Double height,
            Double rotation,
            boolean active
    ) {
        this.assetId = assetId;
        this.src = src;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.active = active;
    }

    public String getAssetId() {
        return assetId;
    }

    public String getSrc() {
        return src;
    }

    public Double getX() {
        return x;
    }

    public Double getY() {
        return y;
    }

    public Double getWidth() {
        return width;
    }

    public Double getHeight() {
        return height;
    }

    public Double getRotation() {
        return rotation;
    }

    public boolean isActive() {
        return active;
    }
}