'use client'
import React from 'react'
import { FlowStep } from '@/flows/models'
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
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Flow Builder</h1>

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

      <div className="flex gap-2">
        <Button onClick={exportFlow}>Export Flow (console.log)</Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Podgląd JSON</Button>
          </DialogTrigger>
          <DialogContent className="p-4">
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(flow, null, 2)}
            </pre>
            <Button className="mt-2" onClick={exportFlow}>
              Log to console
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
