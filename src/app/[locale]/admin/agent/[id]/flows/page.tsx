'use client'
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React, { use, useEffect, useState } from 'react';
import { AgentDefinition, EditorStep } from '@/flows/models';
import FlowBuilder from '@/components/flows/flows-builder';
import { AgentFlow } from '@/data/client/models';
import { Button } from '@/components/ui/button';
import {  DialogContent, DialogTrigger, Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { NetworkIcon } from 'lucide-react';
import { safeJsonParse } from '@/lib/utils';
import { set } from 'date-fns';

export default function FlowsPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, dirtyAgent, status, updateAgent } = useAgentContext();

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  

  register('flows')

  const [newFlowName, setNewFlowName] = useState<string>('');
  const [addFlowError, setAddFlowError] = useState<string>('');
  const [newFlowCode, setNewFlowCode] = useState<string>('');

  const agents = watch('agents') ?? [];
  const flows = watch('flows') ?? [] as AgentFlow[];
  const [rootFlow, setRootFlow] = useState<EditorStep | undefined>(undefined);
  const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(undefined);

  const onFlowChanged = (value: EditorStep) => {
    if (rootFlow) {
      setRootFlow(value);
    }
  }

  useEffect(() => { 
    if (rootFlow && currentFlow) {
      setValue('flows', flows.map(f => f.code === currentFlow.code ? { ...f, flow: rootFlow } : f));
    }

  }, [rootFlow, currentFlow]);

  useEffect(() => {
    const savedFlow = safeJsonParse(sessionStorage.getItem('currentFlow') ?? '', {});
    
    if (flows && flows.length > 0 && !rootFlow && !currentFlow) {
      if (savedFlow) {
        const flow = flows.find(f => f.code === savedFlow.code);
        if (flow) {
          setRootFlow(flow.flow);
          setCurrentFlow(flow);
        } else {
          setRootFlow(flows[0].flow);
          setCurrentFlow(flows[0]);
        }
      } else {
        setRootFlow(flows[0].flow);
        setCurrentFlow(flows[0]);
      }
    }
  }, [flows, rootFlow, currentFlow]);

  useEffect(() => {
    sessionStorage.setItem('currentFlow', JSON.stringify(currentFlow));
  }, [currentFlow]);
  

  useEffect(() => {
    setAddFlowError('');
    if (newFlowCode){ 
      if (flows && flows.find(f => f.code === newFlowCode)) {
        setAddFlowError(t('Flow with this code already exists'));
      } 
    } else {
      setAddFlowError(t('Flow code is required'));
    }

    if (!newFlowName) {
      setAddFlowError(t('Flow name is required'));
    }
  }, [newFlowCode, newFlowName]);

  const { onSubmit, isDirty } = onAgentSubmit(agent, watch, setValue, getValues, updateAgent, t, router, {});

  return (
    <div className="space-y-6">
      <div>
        {flows?.length > 0 && (
          <select className="form-select w-full" value={currentFlow?.code} onChange={(e) => {
            const flow = flows.find(f => f.code === e.target.value);
            if (flow) {
              setRootFlow(flow.flow);
              setCurrentFlow(flow);
            }
          }}>
            {flows.map((flow, index) => (
              <option key={index} value={flow.code}>{flow.name}</option>
            ))}
          </select>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm"><NetworkIcon className="w-4 h-4 mr-2" />{t('Add flow')}</Button>
          </DialogTrigger>
          <DialogContent>
            <div className="space-y-4 p-4">
              <h3 className="font-bold text-sm">{t('Add new flow')}</h3>
              <p>{t('Add a new flow to the agent')}</p>

              {addFlowError && (
                <div className="text-red-500">{addFlowError}</div>
              )}

              <label>{t('Flow name')}</label>           
              <input type="text" placeholder={t('Flow name')} className="form-input w-full" value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)} />
              
              <label>{t('Flow code')}</label>
              <input type="text" placeholder={t('Flow code')} className="form-input w-full" value={newFlowCode} onChange={(e) => setNewFlowCode(e.target.value)} />
            </div>
            <Button onClick={() => {
              setValue('flows', [...flows, { name: newFlowName, code: newFlowCode, flow: { type: 'sequence', steps: [] } }])
            }
            }>Add</Button>                 
          </DialogContent>
        </Dialog>



      </div>

      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }

        <div>
          {rootFlow && (
            <FlowBuilder
              flow={rootFlow}
              onFlowChange={onFlowChanged}
              agentNames={agents.map(a => a.name)}
            />
          )}

        </div>

    </div>
  );
}