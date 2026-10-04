import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

import { IconFolderCode } from "@tabler/icons-react";
import type { Project } from "@/types/Project";

function ProjectCard({ project,onDeleteProject }: { project: Project, onDeleteProject: (id:string)=>void }) {
  const openProject = () => {
    console.log("Opening:", project.id);
    // navigate(`/projects/${project.id}`)
  };
  const handleDelete = () => {
    onDeleteProject(project.id);
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <Card
            onClick={openProject}
            className="group cursor-pointer transition-shadow hover:shadow-md"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
                    <IconFolderCode className="size-5" />
                  </div>

                  <div>
                    <CardTitle>
                      {project.name}
                      {project.name === "Untitled" &&
                        project.untitledNo !== null &&
                        ` ${project.untitledNo}`}
                    </CardTitle>

                    <CardDescription>
                      Project
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {project.description || "No description"}
              </p>
            </CardContent>
          </Card>
        }
      />

      <ContextMenuContent>
        <ContextMenuItem onClick={openProject}>
          Open
        </ContextMenuItem>

        <ContextMenuItem>
          Rename
        </ContextMenuItem>

        <ContextMenuItem>
          Edit Details
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem variant="destructive" onClick={handleDelete}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default ProjectCard;