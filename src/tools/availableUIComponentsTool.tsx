import { z } from 'zod';
import { tool } from 'ai';
import { ToolDescriptor } from './registry';
import { uiComponentsRegistry } from '@/components/flows/flows-components-registry';
import { zodToJsonSchema } from 'zod-to-json-schema'


export function createAvailableUIComponentsTool(databaseIdHash: string): ToolDescriptor {
  return {
    displayName: 'Get available UI components',
    tool: tool({
      description: 'Get the list of available UI components with their properties',
      parameters: z.object({}),
      execute: async () => {
        try {
          return getAvailableUIComponents().map((component) => {
            return {
              name: component.name,
              propsSchema: component.propsSchema,
            }
          });
        } catch (e) {
          console.error(e);
          return 'Error getting available components trace';
        }
      },
    }),
  }
}

export function getAvailableUIComponents() {
  const availableComponents = [];
  for (const [componentName, component] of Object.entries(uiComponentsRegistry)) {
    availableComponents.push({ displayName: component.displayName, name: componentName, propsSchema: zodToJsonSchema(component.props), props: component.props });
  }

  return availableComponents;
}

