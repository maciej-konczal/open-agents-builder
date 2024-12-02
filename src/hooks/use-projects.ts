'use client';

import { useCallback } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/data/projects';
import { CreateProjectInput, UpdateProjectInput } from '@/lib/types/project';

export function useProjects() {
  const projects = getProjects();

  const addProject = useCallback((input: CreateProjectInput) => {
    return createProject(input);
  }, []);

  const editProject = useCallback((input: UpdateProjectInput) => {
    return updateProject(input);
  }, []);

  const removeProject = useCallback((id: string) => {
    deleteProject(id);
  }, []);

  return {
    projects,
    addProject,
    editProject,
    removeProject,
  };
}