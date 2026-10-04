import { IconFolderCode } from "@tabler/icons-react"
import { Button } from "@/components/ui/button";

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ArrowUpRightIcon } from "lucide-react";

type EmptyProjectProp = {
    onCreateProject: ()=>void;
}

export default function EmptyProjects({onCreateProject}:EmptyProjectProp){
    return (
        <div className="flex w-full h-full items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconFolderCode />
            </EmptyMedia>
            <EmptyTitle>No Projects Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t created any projects yet. Get started by creating
              your first project.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <Button onClick={onCreateProject}>Create Project</Button>
          </EmptyContent>
          <Button variant="link" className="text-muted-foreground" size="sm" nativeButton={false} render={<a href="#">Learn More <ArrowUpRightIcon /></a>} />
        </Empty>
      </div>
    )
}