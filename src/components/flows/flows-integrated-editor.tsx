// FullBuilder.tsx (pseudo-kod)

import React, { useState } from 'react'
import { AgentDefinition, FlowStep } from '@/flows/models'
import { AgentsEditor } from './flows-agent-editor'
import FlowBuilder from './flows-builder'

export default function FlowsIntegratedEditor() {
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [rootFlow, setRootFlow] = useState<FlowStep>({ type: 'sequence', steps: [] })

  // Przykład: nazwy agentów do przekazania do FlowStepEditor
  const agentNames = agents.map((a) => a.name)

  const exportAll = () => {
    const finalJson = {
      agents,
      flow: rootFlow,
    }
    console.log('Full JSON:', JSON.stringify(finalJson, null, 2))
  }

  return (
    <div className="flex gap-4">
      <div>
        <AgentsEditor agents={agents} onChange={setAgents} />
      </div>
      <div>
        <FlowBuilder
          flow={rootFlow}
          onFlowChange={setRootFlow}
          agentNames={agentNames}
        />
      </div>
      <button onClick={exportAll}>Export Everything</button>
    </div>
  )
}
