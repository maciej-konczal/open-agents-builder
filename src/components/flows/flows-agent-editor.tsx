'use client'
import React, { useState } from 'react'
import { AgentDefinition, ToolSetting } from '@/flows/models'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'

import { toolConfigurators } from '@/tools/configurators'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TextIcon, TrashIcon, WorkflowIcon } from 'lucide-react'

const availableOpenAIModels = [
  'gpt-4o', 
  'gpt-1o'
]

// Komponent do edycji pojedynczego agenta:
interface FlowAgentEditorProps {
  agent: AgentDefinition
  agents: AgentDefinition[]
  onChange: (updated: AgentDefinition) => void
  onDelete: () => void
}

export function FlowAgentEditor({ agent, onChange, onDelete, agents }: FlowAgentEditorProps) {

  const { t } = useTranslation();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...agent, name: e.target.value })
  }
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...agent, model: e.target.value })
  }
  const handleSystemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...agent, system: e.target.value })
  }

  const addTool = () => {
    const firstToolName = Object.keys(toolConfigurators)[0]
    const newTool: ToolSetting = {
      name: firstToolName || 'unknownTool',
      options: {},
    }
    onChange({
      ...agent,
      tools: [...agent.tools, newTool],
    })
  }

  const removeTool = (index: number) => {
    onChange({
      ...agent,
      tools: agent.tools.filter((_, i) => i !== index),
    })
  }

  const handleToolNameChange = (index: number, newToolName: string) => {
    const updatedTools = [...agent.tools]
    updatedTools[index] = {
      ...updatedTools[index],
      name: newToolName,
    }
    onChange({ ...agent, tools: updatedTools })
  }

  const handleToolOptionsChange = (index: number, newOptions: any) => {
    const updatedTools = [...agent.tools]
    updatedTools[index] = {
      ...updatedTools[index],
      options: newOptions,
    }
    onChange({ ...agent, tools: updatedTools })
  }

  const isNameValid = agent.name !== '' && agents.filter(aa => aa.name == agent.name).length <=1
  const isPromptValid = agent.system !== ''

  return (
    <Card className="p-4 my-2 space-y-3">
      <div className="flex items-center gap-2">
        <Label className="w-12">{t('Name')}</Label>
        <Input value={agent.name} onChange={handleNameChange} />
      </div>
      {!isNameValid && (
            <p className="flex-row text-red-500 text-sm mt-1">
            {t('The agent name must be not empty and must be uniqe.')}
            </p>
        )}

      <div className="flex items-center gap-2">
        <Label className="w-12">{t('Model')}</Label>
        <select
          className="border p-2 rounded text-xs"
          value={agent.model}
          onChange={handleModelChange}
        >
          {availableOpenAIModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label>{t('System prompt:')}</Label>
        <textarea
          className="border p-2 rounded text-sm mt-2"
          rows={3}
          value={agent.system}
          onChange={handleSystemChange}
        />
      </div>

      {!isPromptValid && (
            <p className="flex-row text-red-500 text-sm mt-1">
            {t('The prompt must be not empty.')}
            </p>
        )}            

      <div className="mt-4">
        <div className="flex flex-col gap-2">
          {agent.tools.map((tool, index) => {
            const config = toolConfigurators[tool.name]
            return (
              <div
                key={index}
                className="p-1 border rounded flex items-center justify-between"
              >
                <div className="flex gap-2 items-center">
                  <select
                    className="border p-2 rounded text-xs mr-1"
                    value={tool.name}
                    onChange={(e) =>
                      handleToolNameChange(index, e.target.value)
                    }
                  >
                    {Object.entries(toolConfigurators).map(([key, desc]) => (
                      <option key={key} value={key}>
                        {desc.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-1">
                  {/* Otwieramy popup z konfiguracją */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <TextIcon className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="p-4">
                      <ToolConfiguratorWrapper
                        toolName={tool.name}
                        toolOptions={tool.options}
                        onChange={(newOpts) => handleToolOptionsChange(index, newOpts)}
                      />
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeTool(index)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-2">
          <Button variant="secondary" className="text-sm" onClick={addTool}><PlusIcon className="w-4 h-4" />{t('Add tool')}</Button>
        </div>

        <div className="flex justify-end">
        <Button title={t('Remove agent')} variant="outline" onClick={onDelete}>
          <TrashIcon className="w-4 -h4"/>
        </Button>
      </div>        
      </div>
    </Card>
  )
}

function ToolConfiguratorWrapper({
  toolName,
  toolOptions,
  onChange,
}: {
  toolName: string
  toolOptions: any
  onChange: (opts: any) => void
}) {
  const configuratorDef = toolConfigurators[toolName]
  if (!configuratorDef) {
    return <div>Brak konfiguratora dla narzędzia: {toolName}</div>
  }

  const ConfiguratorComponent = configuratorDef.configurator
  return (
    <div>
      <ConfiguratorComponent options={toolOptions} onChange={onChange} />
    </div>
  )
}

interface FlowAgentsEditorProps {
  agents: AgentDefinition[]
  onChange: (updated: AgentDefinition[]) => void
}

export function FlowAgentsEditor({ agents, onChange }: FlowAgentsEditorProps) {
  const { t } = useTranslation()

  // Dodanie nowego agenta
  const addAgent = () => {
    onChange([
      ...agents,
      {
        name: 'NewAgent',
        model: availableOpenAIModels[0],
        system: '',
        tools: [],
      },
    ])
  }

  const updateAgent = (index: number, updated: AgentDefinition) => {
    const newAgents = [...agents]
    newAgents[index] = updated
    onChange(newAgents)
  }

  const deleteAgent = (index: number) => {
    onChange(agents.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="space-y-4">
      <div className="">
        <Button variant={"outline"} onClick={addAgent}>
            <WorkflowIcon className="w-4 h-4" /> {t('Add agent...')}
        </Button>
      </div> 
      <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 xxl:grid-cols-4 gap-2">
        {agents.map((agent, index) => (
          <FlowAgentEditor
            key={index}
            agents={agents}
            agent={agent}
            onChange={(updated) => updateAgent(index, updated)}
            onDelete={() => deleteAgent(index)}
          />
        ))}
        </div>
      </div>
    </div>
  )
}
