package com.example.firefly_art_studio_api.model;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity 
@Table(name = "project_items")
public class ProjectItem {
    @Id 
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID canvasId;

    @Column(nullable = false)
    private String src;

    @Column (nullable = false)
    private Double x;
    
    @Column (nullable = false)
    private Double y;
    
    @Column
    private Double width;
    
    @Column
    private Double height;
    
    @Column
    private Double rotation = 0.0;
    
    @Column
    private  boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn (name =  "project_id", nullable = false)
    private Project project;

    public ProjectItem() {}

    public ProjectItem(UUID canvasId, String src, Double x, Double y, Double width, Double height, Double rotation, boolean active, Project project){
        this.canvasId = canvasId;
        this.src = src;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.active = active;
        this.project = project;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCanvasId(){
        return canvasId;
    }

    public String getSrc(){
        return src;
    }

    public Double getX(){
        return x;
    }

    public void setX(Double x){
        this.x = x;
    }

    public Double getY(){
        return y;
    }

    public void setY(Double y){
        this.y = y;
    }

    public Double getWidth(){
        return width;
    }

    public void setWidth(Double width){
        this.width = width;
    }

    public Double getHeight(){
        return height;
    }

    public void setHeight(Double height){
        this.height = height;
    }

    public Double getRotation(){
        return rotation;
    }

    public void setRotation(Double rotation){
        this.rotation = rotation;
    }

    public boolean getActive(){
        return active;
    }

    public void setActive(boolean active){
        this.active = active;
    }
}
