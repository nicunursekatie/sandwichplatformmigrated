import React, { useState } from "react";
import ProjectListSimplified from "@/components/projects/ProjectListSimplified";
import ProjectDetailSimplified from "@/components/projects/ProjectDetailSimplified";

export default function ProjectsSimplified() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  if (selectedProjectId) {
    return (
      <ProjectDetailSimplified
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return <ProjectListSimplified onProjectSelect={setSelectedProjectId} />;
}