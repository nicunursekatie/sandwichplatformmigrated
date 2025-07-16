import React, { useState } from "react";
import ProjectListSimplified from "@/components/projects/ProjectListSimplified";
import ProjectDetailPolished from "@/components/projects/ProjectDetailPolished";

export default function ProjectsSimplified() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  if (selectedProjectId) {
    return (
      <ProjectDetailPolished
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return <ProjectListSimplified onProjectSelect={setSelectedProjectId} />;
}