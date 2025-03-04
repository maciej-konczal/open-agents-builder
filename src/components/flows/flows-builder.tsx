'use client'
import React from 'react'
import { EditorStep } from '@/flows/models'
import { FlowStepEditor } from './flows-step-editor'

interface FlowBuilderProps {
  /** 
   * Current state of the main flow, e.g., { type: 'sequence', steps: [...] }. 
   */
  flow: EditorStep

  /**
   * Function to update the flow.
   */
  onFlowChange: (newFlow: EditorStep) => void


  onNoAgentsError?: () => void

  /**
   * List of agent names that can be selected in 'step' type steps.
   */
  agentNames: string[]
}

/**
 * Main component rendering the flow editor (FlowStepEditor) and a JSON export button.
 */
export default function FlowBuilder({
  flow,
  onFlowChange,
  agentNames,
  onNoAgentsError
}: FlowBuilderProps) {
  // Helper function to display the flow in the console
  const exportFlow = () => {
    console.log('Flow JSON:', JSON.stringify(flow, null, 2))
  }

  return (
      <FlowStepEditor
        step={flow}
        onNoAgentsError={onNoAgentsError}
        onChange={onFlowChange}
        onDelete={() => {
            // If the user clicks delete on the main editor,
            // we can, for example, clear the flow to an empty sequence
          onFlowChange({ type: 'sequence', steps: [] })
        }}
        availableAgentNames={agentNames}
      />
  )
}
