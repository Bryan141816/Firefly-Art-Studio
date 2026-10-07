package com.example.firefly_art_studio_api.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path uploadDirectory = Paths.get("uploads");

    public FileStorageService() throws IOException {
        Files.createDirectories(uploadDirectory);
    }

    public String save(MultipartFile file) throws IOException {
        String extension = "";

        String originalFilename = file.getOriginalFilename();

        if (originalFilename != null) {
            int dotIndex = originalFilename.lastIndexOf(".");
            if (dotIndex >= 0) {
                extension = originalFilename.substring(dotIndex);
            }
        }

        String filename = UUID.randomUUID() + extension;

        Path destination = uploadDirectory.resolve(filename);

        Files.copy(
            file.getInputStream(),
            destination,
            StandardCopyOption.REPLACE_EXISTING
        );

        // This is what gets stored in ProjectItem.src
        return "/uploads/" + filename;
    }
}