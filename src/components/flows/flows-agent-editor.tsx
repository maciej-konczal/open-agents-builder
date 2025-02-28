// AgentsEditor.tsx
'use client'
import React, { useState } from 'react'
import { AgentDefinition, ToolSetting } from './types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'

// Import listy dostępnych narzędzi i ich konfiguratorów:
import { toolConfigurators } from '@/tools/configurators'
import { t } from 'i18next'
import { useTranslation } from 'react-i18next'
import { WorkflowIcon } from 'lucide-react'

// Możemy zdefiniować listę modeli:
const availableOpenAIModels = [
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-32k',
  'gpt-4o', // cokolwiek jest w Twoim setupie
]

// Komponent do edycji pojedynczego agenta:
interface FlowAgentEditorProps {
  agent: AgentDefinition
  onChange: (updated: AgentDefinition) => void
  onDelete: () => void
}

export function FlowAgentEditor({ agent, onChange, onDelete }: FlowAgentEditorProps) {
  // Edycja nazwy
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...agent, name: e.target.value })
  }
  // Edycja modelu
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...agent, model: e.target.value })
  }
  // Edycja system promptu
  const handleSystemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...agent, system: e.target.value })
  }

  // Narzędzia: dodanie nowego
  const addTool = () => {
    // Na start – wybieramy cokolwiek z toolConfigurators (pierwszy lepszy klucz?)
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

  // Usunięcie narzędzia
  const removeTool = (index: number) => {
    onChange({
      ...agent,
      tools: agent.tools.filter((_, i) => i !== index),
    })
  }

  // Zmiana nazwy narzędzia
  const handleToolNameChange = (index: number, newToolName: string) => {
    const updatedTools = [...agent.tools]
    updatedTools[index] = {
      ...updatedTools[index],
      name: newToolName,
      // Reset options gdy zmieniamy narzędzie?
      // options: {}
    }
    onChange({ ...agent, tools: updatedTools })
  }

  // Edycja opcji narzędzia (po zamknięciu popupu)
  const handleToolOptionsChange = (index: number, newOptions: any) => {
    const updatedTools = [...agent.tools]
    updatedTools[index] = {
      ...updatedTools[index],
      options: newOptions,
    }
    onChange({ ...agent, tools: updatedTools })
  }

  return (
    <Card className="p-4 my-2 space-y-3">
      <div className="flex justify-between">
        <div className="font-semibold text-lg">Agent: {agent.name || '(bez nazwy)'}</div>
        <Button variant="destructive" onClick={onDelete}>
          Usuń
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Label className="w-20">Name:</Label>
        <Input value={agent.name} onChange={handleNameChange} />
      </div>

      <div className="flex items-center gap-2">
        <Label className="w-20">Model:</Label>
        <select
          className="border p-1 rounded"
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
        <Label>System prompt:</Label>
        <textarea
          className="border p-2 rounded"
          rows={3}
          value={agent.system}
          onChange={handleSystemChange}
        />
      </div>

      {/* Lista narzędzi */}
      <div className="mt-4">
        <div className="font-semibold mb-2">Tools</div>
        <div className="flex flex-col gap-2">
          {agent.tools.map((tool, index) => {
            const config = toolConfigurators[tool.name]
            return (
              <div
                key={index}
                className="p-2 border rounded flex items-center justify-between"
              >
                <div className="flex gap-2 items-center">
                  <select
                    className="border p-1 rounded"
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

                <div className="flex gap-2">
                  {/* Otwieramy popup z konfiguracją */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        Edytuj
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
                    variant="destructive"
                    onClick={() => removeTool(index)}
                  >
                    Usuń
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-2">
          <Button onClick={addTool}>Dodaj narzędzie</Button>
        </div>
      </div>
    </Card>
  )
}

/**
 * Wrapper, który renderuje odpowiedni konfigurator na podstawie toolName.
 */
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
      <h2 className="font-semibold text-lg mb-2">
        {configuratorDef.displayName} – konfiguracja
      </h2>
      <ConfiguratorComponent options={toolOptions} onChange={onChange} />
    </div>
  )
}

// Komponent lista agentów:
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
        {agents.map((agent, index) => (
          <FlowAgentEditor
            key={index}
            agent={agent}
            onChange={(updated) => updateAgent(index, updated)}
            onDelete={() => deleteAgent(index)}
          />
        ))}
      </div>
    </div>
  )
}
