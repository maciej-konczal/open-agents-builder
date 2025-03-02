'use client'
import React from 'react'
import { convertToFlowDefinition, FlowStep } from '@/flows/models'
import { FlowStepEditor } from './flows-step-editor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'

interface FlowBuilderProps {
  /** 
   * Aktualny stan głównego flow, np. { type: 'sequence', steps: [...] }. 
   */
  flow: FlowStep

  /**
   * Funkcja do aktualizacji flow.
   */
  onFlowChange: (newFlow: FlowStep) => void

  /**
   * Lista nazw agentów, które można wybrać w krokach typu 'step'.
   */
  agentNames: string[]
}

/**
 * Komponent główny, renderujący edytor flow (FlowStepEditor) i przycisk eksportu JSON.
 */
export default function FlowBuilder({
  flow,
  onFlowChange,
  agentNames,
}: FlowBuilderProps) {
  // Funkcja pomocnicza do wyświetlenia flow w konsoli
  const exportFlow = () => {
    console.log('Flow JSON:', JSON.stringify(flow, null, 2))
  }

  return (
    <div className="p-2">
      <FlowStepEditor
        step={flow}
        onChange={onFlowChange}
        onDelete={() => {
          // Jeśli użytkownik kliknie usuń na głównym edytorze,
          // to możemy np. wyczyścić flow do pustej sekwencji
          onFlowChange({ type: 'sequence', steps: [] })
        }}
        availableAgentNames={agentNames}
      />
    </div>
  )
}
