'use client'
import { useTranslation } from 'react-i18next';
import { useAgentContext } from '@/contexts/agent-context';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { onAgentSubmit } from '../general/page';
import { AgentStatus } from '@/components/layout/agent-status';
import React, { use, useEffect, useState } from 'react';
import { AgentDefinition, EditorStep, FlowInputVariable } from '@/flows/models';
import FlowBuilder from '@/components/flows/flows-builder';
import { AgentFlow } from '@/data/client/models';
import { Button } from '@/components/ui/button';
import {  DialogContent, DialogTrigger, Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { NetworkIcon, TextIcon, ZapIcon } from 'lucide-react';
import { safeJsonParse } from '@/lib/utils';
import { set } from 'date-fns';
import { FlowsExecForm } from '@/components/flows/flows-exec-form';
import { Accordion, AccordionContent, AccordionTrigger } from '@/components/ui/accordion';
import { AccordionItem } from '@radix-ui/react-accordion';
import { FlowInputVariablesEditor } from '@/components/flows/flows-input-variables-editor';
import { FlowAgentsEditor } from '@/components/flows/flows-agent-editor';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

export default function FlowsPage() {

  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, dirtyAgent, status, updateAgent } = useAgentContext();

  const [newFlowDialogOpen, setNewFlowDialogOpen] = useState<boolean>(false);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  const [executeFlowDialogOpen, setExecuteFlowDialogOpen] = useState<boolean>(false);

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });  

  
  register('defaultFlow')
  register('flows')

  const [editFlowId, setEditFlowId] = useState<number>(-1);
  const [editFlowName, setEditFlowName] = useState<string>('');
  const [addFlowError, setAddFlowError] = useState<string>('');
  const [editFlowCode, setEditFlowCode] = useState<string>('');

  const agents = watch('agents') ?? [];
  const defaultFlow = watch('defaultFlow') ?? '';
  const inputs = watch('inputs') ?? [];

  const flows = watch('flows') ?? [] as AgentFlow[];
  const [rootFlow, setRootFlow] = useState<EditorStep | undefined>(undefined);
  const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(undefined);

  const onFlowChanged = (value: EditorStep) => {
    if (rootFlow) {
      setRootFlow(value);
    }
  }
  
  const onAgentsChanged = (value: AgentDefinition[]) => {
    setValue('agents', value);
  }

  register('inputs')
  const onVariablesChanged = (value: FlowInputVariable[]) => {
    setValue('inputs', value);
  }


  useEffect(() => { 
    if (rootFlow && currentFlow) {
      setInitialLoadDone(true);
      setValue('flows', flows.map(f => f.code === currentFlow.code ? { ...f, flow: rootFlow } : f));
    }
  }, [rootFlow, currentFlow]);

  useEffect(() => {
    const savedFlow = safeJsonParse(sessionStorage.getItem('currentFlow') ?? '', null);
    
    if (flows && flows.length > 0 && !initialLoadDone) {
      if (savedFlow || defaultFlow) {
        const flow = savedFlow ? flows.find(f => f.code === savedFlow.code) : flows.find(f => f.code === defaultFlow);
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
  }, [flows, initialLoadDone]);

  useEffect(() => {
    if (currentFlow) {
      sessionStorage.setItem('currentFlow', JSON.stringify(currentFlow));
    }
  }, [currentFlow]);
  

  useEffect(() => {
    setAddFlowError('');
    if (editFlowCode){ 
      if (editFlowId < 0) if (flows && flows.find(f => f.code === editFlowCode)) {
        setAddFlowError(t('Flow with this code already exists'));
      } 
    } else {
      setAddFlowError(t('Flow code is required'));
    }

    if (!editFlowName) {
      setAddFlowError(t('Flow name is required'));
    }
  }, [editFlowCode, editFlowName]);

  const { onSubmit, isDirty } = onAgentSubmit(agent, watch, setValue, getValues, updateAgent, t, router, {});

  return (
    <div className="space-y-6">
      <div>
        {flows?.length > 0 && (
          <select className="form-select w-full" value={currentFlow?.code ?? defaultFlow} onChange={(e) => {
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
        <Dialog open={newFlowDialogOpen}  onOpenChange={setNewFlowDialogOpen}>
          <DialogContent>
            <div className="space-y-4 p-4">
              <h3 className="font-bold text-sm">{t('Add new flow')}</h3>
              <p>{t('Add a new flow to the agent')}</p>

              {addFlowError && (
                <div className="text-red-500">{addFlowError}</div>
              )}

              <label>{t('Flow name')}</label>           
              <input type="text" placeholder={t('Flow name')} className="form-input w-full" value={editFlowName} onChange={(e) => setEditFlowName(e.target.value)} />
              
              <label>{t('Flow code')}</label>
              <input type="text" placeholder={t('Flow code')} className="form-input w-full" value={editFlowCode} onChange={(e) => setEditFlowCode(e.target.value)} />
            </div>
            <Button onClick={() => {
              if (!addFlowError) {
                if (editFlowId >= 0) {
                  setValue('flows', flows.map((f, index) => index === editFlowId ? { name: editFlowName, code: editFlowCode, flow: f.flow } : f));
                } else {  
                  setValue('flows', [...flows, { name: editFlowName, code: editFlowCode, flow: { type: 'sequence', steps: [] } }]);
                }

                if (flows.length === 1) {
                  setValue('defaultFlow', flows[0].code);
                  setRootFlow(flows[0].flow);
                  setCurrentFlow(flows[0]);                  
                }
                setNewFlowDialogOpen(false);
              }
            }
            }>{t('Save changes')}</Button>                 
          </DialogContent>
        </Dialog>




        <Drawer direction="right" open={executeFlowDialogOpen} onOpenChange={setExecuteFlowDialogOpen}>
          <DrawerContent className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md">
              <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
          <div className="px-4 py-6 sm:px-6"></div>
            <h3 className="font-bold text-lg">{t('Execute flow')}</h3>
          </div>
          <div className="relative flex-1 px-4 sm:px-6"></div>
              <Button onClick={() => {
                
                setExecuteFlowDialogOpen(false);
              }
            }>{t('Close')}</Button>                 
            </div>
          </DrawerContent>
        </Drawer>

        <Button variant="outline" size="sm" onClick={() => {
            setEditFlowCode('');
            setEditFlowName('');
            setEditFlowId(-1);
            setNewFlowDialogOpen(true)
          }
        } className="ml-2"><NetworkIcon className="w-4 h-4" />{t('Add flow')}</Button>

        <Button variant="outline" size="sm" onClick={() => {
          setEditFlowCode(currentFlow?.code ?? '');
          setEditFlowName(currentFlow?.name ?? '');
          setEditFlowId(flows.findIndex(f => f.code === currentFlow?.code) ?? -1);
          setNewFlowDialogOpen(true)
        }
      } className="ml-2" title={t('Rename flow...')}><TextIcon className="w-4 h-4" /></Button>

        {currentFlow && (
          <Button variant="outline" size="sm" onClick={() => setValue('defaultFlow', currentFlow?.code)} className="ml-2"><ZapIcon className="w-4 h-4"/>{t('Set as default flow')}</Button>
        )}
        {currentFlow && (
          <Button variant="outline" size="sm" onClick={() => setExecuteFlowDialogOpen(true)} className="ml-2"><ZapIcon className="w-4 h-4"/>{t('Execute')}</Button>
        )}

      </div>

      { isDirty ? (
        <AgentStatus status={{ id: 'dirty', message: t('You have unsaved changes'), type: 'warning' }} />
      ) : (
      <AgentStatus status={status} />
      ) }

          {rootFlow && (
            
            <div>
                <Accordion type="multiple"  className="w-full">
                  <AccordionItem value="item-1">
                      <AccordionTrigger>{t('Inputs')}</AccordionTrigger>
                      <AccordionContent>
                        <FlowInputVariablesEditor variables={inputs} onChange={onVariablesChanged} />
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                      <AccordionTrigger>{t('Available agents')})</AccordionTrigger>
                      <AccordionContent>
                        <FlowAgentsEditor agents={agents} onChange={onAgentsChanged} />
                      </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <FlowBuilder
                flow={rootFlow}
                onFlowChange={onFlowChanged}
                agentNames={agents.map(a => a.name)}
                />                        
          </div>

          )}

        <Button onClick={handleSubmit(onSubmit)}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
        {t('Save')}
        </Button>
    </div>
  );
}