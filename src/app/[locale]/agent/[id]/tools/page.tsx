'use client'
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React from 'react';
import { ToolConfiguration } from '@/data/client/models';
import { ToolConfigurator } from '@/components/tool-configurator';
import { DeleteIcon, PlusIcon, Trash2Icon } from 'lucide-react';

// Import your new dynamic ToolConfigurator

export default function ToolsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, status, updateAgent } = useAgentContext();

  // agent?.toForm(null) presumably returns an object with { id, tools, ... }
  // Adjust to match your actual shape.
  const defaultValues = agent ? agent.toForm(null) : {};
  
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues,
  });

  // Tools are stored in watch('tools') (or fallback to {} if none).
  const tools: Record<string, ToolConfiguration> = watch('tools') || {};

  // Hook up your existing onSubmit with references to the new tools
  const { onSubmit, isDirty } = onAgentSubmit(
    agent,
    watch,
    setValue,
    getValues,
    updateAgent,
    t,
    router,
    {}
  );

  // Add a new empty tool
  const handleAddTool = () => {
    // We'll create a unique key (like "tool-123") or use a timestamp:
    const newKey = `tool-${Date.now()}`;
    // Add a default configuration. 
    // By default, let's pick "sendEmail" as the chosen tool:
    setValue(`tools.${newKey}`, {
      tool: 'currentDate',
      description: '',
      options: {},
    });
  };

  // Remove a tool by key
  const handleRemoveTool = (key: string) => {
    const currentTools = getValues('tools') || {};
    delete currentTools[key];
    setValue('tools', { ...currentTools }); // triggers re-render
  };

  // Called by each configurator to update a tool
  const handleToolChange = (key: string, updated: ToolConfiguration) => {
    setValue(`tools.${key}`, updated, { shouldDirty: true });
  };

  register('tools'); // register the tools field with react-hook-form

  return (
    <div className="space-y-6">
      { isDirty ? (
        <AgentStatus
          status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }}
        />
      ) : (
        <AgentStatus status={status} />
      )}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Tools Section */}
        <div>
          <div className="text-sm">
            <Button variant={"secondary"} size={"sm"} onClick={(e) => { e.preventDefault(); handleAddTool(); }}><PlusIcon className='w-4 h-4' /> {t('Add Tool')}</Button>
          </div>          
          {Object.entries(tools).map(([toolKey, config]) => (
            <div key={toolKey} className="mt-4 border p-3 mb-3 rounded">
              <ToolConfigurator
                toolKey={toolKey}
                configuration={config}
                onChange={handleToolChange}
              />
              <div className="pt-4 flex justify-end">
                <Button variant="secondary" size="sm" onClick={(e) => { e.preventDefault(); handleRemoveTool(toolKey); }}>
                  <Trash2Icon className='w-4 h-4'/> {t('Remove tool')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Save */}
        <div>
          <Button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent
                       shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 
                       hover:bg-indigo-700 focus:outline-none focus:ring-2 
                       focus:ring-offset-2 focus:ring-indigo-500"
          >
            {t('Save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
