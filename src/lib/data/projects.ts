import { v4 as uuidv4 } from 'uuid';
import { Project, CreateProjectInput, UpdateProjectInput } from '../types/project';

// Initial projects with GUIDs
export const projects: Project[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Project Alpha',
    description: 'Our first AI project',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '987fcdeb-51a2-43d7-9876-543210987001',
    name: 'Project Beta',
    description: 'Advanced language model implementation',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
  },
];

export function getProjects(): Project[] {
  return projects;
}

export function getProject(id: string): Project | undefined {
  return projects.find(project => project.id === id);
}

export function createProject(input: CreateProjectInput): Project {
  const now = new Date().toISOString();
  const newProject: Project = {
    id: uuidv4(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  projects.push(newProject);
  return newProject;
}

export function updateProject(input: UpdateProjectInput): Project {
  const index = projects.findIndex(p => p.id === input.id);
  if (index === -1) {
    throw new Error('Project not found');
  }

  const updatedProject = {
    ...projects[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  
  projects[index] = updatedProject;
  return updatedProject;
}

export function deleteProject(id: string): void {
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) {
    projects.splice(index, 1);
  }
}