/**
 * Projects Toggle Page
 * 
 * This component serves as a wrapper that allows toggling between the original
 * projects implementation and the new integrated version for easy comparison and testing.
 */

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ProjectsOriginal from './projects-clean';
import ProjectsIntegrated from './projects-integrated';

export default function ProjectsToggle() {
  // Use localStorage to persist the user's preference
  const [useNewUI, setUseNewUI] = useState<boolean>(false);
  
  // Initialize from localStorage when the component mounts
  useEffect(() => {
    const savedPreference = localStorage.getItem('useNewProjectsUI');
    if (savedPreference !== null) {
      setUseNewUI(savedPreference === 'true');
    }
  }, []);
  
  const handleToggle = (checked: boolean) => {
    setUseNewUI(checked);
    localStorage.setItem('useNewProjectsUI', checked.toString());
  };
  
  return (
    <div>
      <div className="flex items-center justify-end mb-4 px-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="projects-ui-toggle" className="text-sm">
            {useNewUI ? "Using new projects UI" : "Using original projects UI"}
          </Label>
          <Switch 
            id="projects-ui-toggle" 
            checked={useNewUI} 
            onCheckedChange={handleToggle}
          />
        </div>
      </div>
      
      {useNewUI ? <ProjectsIntegrated /> : <ProjectsOriginal />}
    </div>
  );
}
