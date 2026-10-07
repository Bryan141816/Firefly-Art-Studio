import { useEffect, useState } from "react";
import EmptyProjects from "@/components/empty-projects";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/Project";
import ProjectCard from "@/components/project-card";
import { apiFetch } from "@/lib/api";



function ProjectsList() {
  const [projects, setProjects] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
    const fetchProjects = async () => {
    try {
      const response = await apiFetch(
        "/projects",
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data: Project[] = await response.json();

      setProjects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  async function onCreateProject() {
    try {
      const response = await apiFetch("/project", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: null,
          description: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.status}`);
      }

      const project: Project = await response.json();

      setProjects((prev) => [...prev, project]);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  }

  async function onDeleteProject(id: string) {
    try {
      const response = await apiFetch(
        `/project/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.status}`);
      }

      // Remove the deleted project from the array
      setProjects((prev) =>
        prev.filter((project) => project.id !== id)
      );
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  }


  if (projects.length === 0) {
    return (
      <EmptyProjects onCreateProject={onCreateProject}/>
    );
  }

 return (
    <div className="h-full w-full overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Projects
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage your projects and artwork.
          </p>
        </div>

        <Button onClick={onCreateProject}>
          <IconPlus />
          Create Project
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDeleteProject={onDeleteProject}
          />
        ))}
      </div>
    </div>
  );
}

export default ProjectsList;