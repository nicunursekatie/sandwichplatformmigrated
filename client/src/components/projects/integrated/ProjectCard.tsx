/**
 * Wrapper for the imported ProjectCard component
 * Adapts the component to work with the existing application
 */

import { ProjectCard as ImportedProjectCard } from '../projectsfromnewapp/projects/project-card';
import { projectAdapters } from '@/lib/project-adapters';
import type { Project } from '@shared/schema';
import { hasPermission, PERMISSIONS, canEditProject, canDeleteProject } from '@shared/auth-utils';
import { useAuth } from '@/hooks/useAuth';

interface ProjectCardProps {
  project: any;
  onEdit?: (project: any) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
}

export function ProjectCard({ project, onEdit, onDelete, showActions = true }: ProjectCardProps) {
  const { user } = useAuth();
  
  // Adapt the project to the expected format
  const adaptedProject = projectAdapters.adaptToNewFormat(project);
  
  // Handle permission checks
  const handleEdit = (project: Project) => {
    // Only allow edit if user has permission
    if (!showActions || !onEdit || !canEditProject(user, project)) return;
    onEdit(project);
  };
  
  const handleDelete = (id: number) => {
    // Only allow delete if user has permission
    if (!showActions || !onDelete || !canDeleteProject(user, project)) return;
    onDelete(id);
  };
  
  return (
    <ImportedProjectCard
      project={adaptedProject}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}

export default ProjectCard;
