package com.example.firefly_art_studio_api.model;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity 
@Table(name="users")
public class User {
    @Id 
    @GeneratedValue (strategy=GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String googleId;

    @Column(nullable=false)
    private String email;

    private String name;

    private String profilePictureUrl;

    public User(){}

    public UUID getId(){
        return id;
    }

    public String getGoogleId(){
        return googleId;
    }
            
    public String getEmail(){
        return email;
    }
    public User(String googleId, String email, String name, String profilePictureUrl){
        this.googleId = googleId;
        this.email = email;
        this.name = name;
        this.profilePictureUrl = profilePictureUrl;
    }

    public void setName(String name){
        this.name = name;
    }

    public String getName(){
        return name;
    }

    public String getProfilePictureUrl(){
        return profilePictureUrl;
    }

}
