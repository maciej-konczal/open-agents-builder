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
import { MDXEditorMethods } from '@mdxeditor/editor';
import { MarkdownEditor } from '@/components/markdown-editor';
import { EventConfiguration } from '@/data/client/models';
import { EventConfigurator } from '@/components/event-configurator';
import { PlusIcon } from 'lucide-react';
import { Trash2Icon } from '@/components/icons';
import { SaveAgentAsTemplateButton } from '@/components/save-agent-as-template-button';

// Import the new EventConfigurator

export default function EventsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, status, updateAgent } = useAgentContext();

  // agent.toForm(null) presumably returns an object with { id, safetyRules, events, ... } 
  // Adjust according to your actual agent form shape.
  const defaultValues = agent ? agent.toForm(null) : {};

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues,
  });

  const editors = {
    safetyRules: React.useRef<MDXEditorMethods>(null),
  };

  // Pull out the events from form state
  // We assume they're stored as a dictionary: Record<string, EventConfiguration>
  const events: Record<string, EventConfiguration> = watch('events') || {};

  const { onSubmit, isDirty } = onAgentSubmit(
    agent,
    watch,
    setValue,
    getValues,
    updateAgent,
    t,
    router,
    editors
  );

  // Add a new empty event
  const handleAddEvent = () => {
    const newKey = `event-${Date.now()}`;
    setValue(`events.${newKey}`, {
      condition: '',
      action: '',
    });
  };

  // Remove an existing event
  const handleRemoveEvent = (key: string) => {
    const currentEvents = getValues('events') || {};
    delete currentEvents[key];
    setValue('events', { ...currentEvents });
  };

  // Handler to update an event’s data 
  const handleEventChange = (key: string, updated: EventConfiguration) => {
    setValue(`events.${key}`, updated, { shouldDirty: true });
  };

  // Register fields with react-hook-form
  register('events');

  return (
    <div className="space-y-6">
      {isDirty ? (
        <AgentStatus
          status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }}
        />
      ) : (
        <AgentStatus status={status} />
      )}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

        {/* Events */}
        <div>
          <div className="text-sm">
            <Button variant={"outline"} size={"sm"} onClick={(e) => { e.preventDefault(); handleAddEvent(); }}><PlusIcon className="w-4 h-4" />{t('Add event based action')}</Button>
          </div>          
          {Object.entries(events).map(([eventKey, configuration]) => (
            <div key={eventKey} className="mt-4 border p-3 mb-3 rounded text-sm">
              <EventConfigurator
                eventKey={eventKey}
                configuration={configuration}
                onChange={handleEventChange}
              />
              <div className="pt-4 flex justify-end text-sm">
                <Button variant="secondary" onClick={(e) => { e.preventDefault(); handleRemoveEvent(eventKey) }}>
                  <Trash2Icon className="w-4 h-4" />
                  {t('Remove action')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Save */}
      <div className="flex justify-between">
        <Button
        type="submit"
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
        {t('Save')}
        </Button>

        <SaveAgentAsTemplateButton getFormValues={getValues} agent={agent} onSaved={function (): void {
            } } />
      </div>
      </form>
    </div>
  );
}
