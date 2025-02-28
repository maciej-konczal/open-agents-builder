'use client'
import React from 'react'
import { FlowStep } from '@/flows/models'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'

interface FlowStepEditorProps {
  step: FlowStep
  onChange: (newStep: FlowStep) => void
  onDelete: () => void

  /**
   * Lista nazw agentów, które możemy wybrać w kroku typu 'step'.
   * Gdy step.type === 'step', zamiast zwykłego <Input> do 'agent'
   * robimy <select> z dostępnymi nazwami agentów.
   */
  availableAgentNames: string[]
}

/**
 * Komponent rekurencyjny do edycji FlowStep (step / sequence / parallel / race / condition / branch).
 */
export function FlowStepEditor({
  step,
  onChange,
  onDelete,
  availableAgentNames,
}: FlowStepEditorProps) {
  switch (step.type) {
    // ================ STEP ================
    case 'step': {
      const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({ ...step, agent: e.target.value })
      }
      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...step, input: e.target.value })
      }

      return (
        <Card className="p-4 my-2 border space-y-2">
          <div className="flex items-center gap-2">
            <label className="w-20">Agent:</label>
            <select
              className="border p-1 rounded"
              value={step.agent}
              onChange={handleAgentChange}
            >
              <option value="">(Wybierz agenta)</option>
              {availableAgentNames.map((agentName) => (
                <option key={agentName} value={agentName}>
                  {agentName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-20">Input:</label>
            <Input
              value={step.input}
              onChange={handleInputChange}
              placeholder="Treść inputu..."
            />
          </div>
          <div className="flex justify-end">
            <Button variant="destructive" onClick={onDelete}>
              Usuń krok
            </Button>
          </div>
        </Card>
      )
    }

    // ================ SEQUENCE ================
    case 'sequence': {
      const handleAddStep = () => {
        const newSteps = [
          ...step.steps,
          { type: 'step', agent: '', input: '' } as FlowStep,
        ]
        onChange({ ...step, steps: newSteps })
      }

      const handleAddSequence = () => {
        const newSteps = [
          ...step.steps,
          { type: 'sequence', steps: [] } as FlowStep,
        ]
        onChange({ ...step, steps: newSteps })
      }

      const handleAddParallel = () => {
        const newSteps = [
          ...step.steps,
          { type: 'parallel', branches: [] } as FlowStep,
        ]
        onChange({ ...step, steps: newSteps })
      }

      const handleAddRace = () => {
        const newSteps = [
          ...step.steps,
          { type: 'race', branches: [] } as FlowStep,
        ]
        onChange({ ...step, steps: newSteps })
      }

      const handleAddCondition = () => {
        const newSteps = [
          ...step.steps,
          { type: 'condition', condition: '', steps: [] } as FlowStep,
        ]
        onChange({ ...step, steps: newSteps })
      }

      const handleAddBranch = () => {
        const newSteps = [
          ...step.steps,
          {
            type: 'branch',
            condition: '',
            trueFlow: [],
            falseFlow: [],
          } as FlowStep,
        ]
        onChange({ ...step, steps: newSteps })
      }

      const handleStepChange = (index: number, newStep: FlowStep) => {
        const newSteps = [...step.steps]
        newSteps[index] = newStep
        onChange({ ...step, steps: newSteps })
      }

      const handleDeleteStep = (index: number) => {
        const newSteps = step.steps.filter((_, i) => i !== index)
        onChange({ ...step, steps: newSteps })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">Sequence</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="ml-4">
            {step.steps.map((childStep, index) => (
              <FlowStepEditor
                key={index}
                step={childStep}
                onChange={(newStep) => handleStepChange(index, newStep)}
                onDelete={() => handleDeleteStep(index)}
                availableAgentNames={availableAgentNames}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAddStep}>+ step</Button>
            <Button onClick={handleAddSequence}>+ sequence</Button>
            <Button onClick={handleAddParallel}>+ parallel</Button>
            <Button onClick={handleAddRace}>+ race</Button>
            <Button onClick={handleAddCondition}>+ condition</Button>
            <Button onClick={handleAddBranch}>+ branch</Button>
          </div>
        </Card>
      )
    }

    // ================ PARALLEL ================
    case 'parallel': {
      const { branches } = step

      const handleAddBranch = () => {
        onChange({ ...step, branches: [...branches, []] })
      }

      const handleBranchStepChange = (
        branchIndex: number,
        stepIndex: number,
        newStep: FlowStep
      ) => {
        const newBranches = [...branches]
        newBranches[branchIndex] = [...newBranches[branchIndex]]
        newBranches[branchIndex][stepIndex] = newStep
        onChange({ ...step, branches: newBranches })
      }

      const handleAddStepToBranch = (branchIndex: number) => {
        const newBranches = [...branches]
        const newFlow = [
          ...newBranches[branchIndex],
          { type: 'step', agent: '', input: '' } as FlowStep,
        ]
        newBranches[branchIndex] = newFlow
        onChange({ ...step, branches: newBranches })
      }

      const handleDeleteBranchStep = (branchIndex: number, stepIndex: number) => {
        const newBranches = [...branches]
        newBranches[branchIndex] = newBranches[branchIndex].filter(
          (_, i) => i !== stepIndex
        )
        onChange({ ...step, branches: newBranches })
      }

      const handleDeleteBranch = (branchIndex: number) => {
        const newBranches = branches.filter((_, i) => i !== branchIndex)
        onChange({ ...step, branches: newBranches })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">Parallel</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="space-y-4">
            {branches.map((branchFlow, bIdx) => (
              <Card key={bIdx} className="p-4 border">
                <div className="flex justify-between items-center mb-2">
                  <div>Gałąź {bIdx + 1}</div>
                  <Button variant="destructive" onClick={() => handleDeleteBranch(bIdx)}>
                    Usuń gałąź
                  </Button>
                </div>

                {branchFlow.map((childStep, sIdx) => (
                  <FlowStepEditor
                    key={sIdx}
                    step={childStep}
                    onChange={(newStep) =>
                      handleBranchStepChange(bIdx, sIdx, newStep)
                    }
                    onDelete={() => handleDeleteBranchStep(bIdx, sIdx)}
                    availableAgentNames={availableAgentNames}
                  />
                ))}

                <Button onClick={() => handleAddStepToBranch(bIdx)}>
                  Dodaj krok w tej gałęzi
                </Button>
              </Card>
            ))}
          </div>

          <Button onClick={handleAddBranch}>Dodaj gałąź równoległą</Button>
        </Card>
      )
    }

    // ================ RACE ================
    case 'race': {
      const { branches } = step

      const handleAddBranch = () => {
        onChange({ ...step, branches: [...branches, []] })
      }

      const handleBranchStepChange = (
        branchIndex: number,
        stepIndex: number,
        newStep: FlowStep
      ) => {
        const newBranches = [...branches]
        newBranches[branchIndex] = [...newBranches[branchIndex]]
        newBranches[branchIndex][stepIndex] = newStep
        onChange({ ...step, branches: newBranches })
      }

      const handleAddStepToBranch = (branchIndex: number) => {
        const newBranches = [...branches]
        const newFlow = [
          ...newBranches[branchIndex],
          { type: 'step', agent: '', input: '' } as FlowStep,
        ]
        newBranches[branchIndex] = newFlow
        onChange({ ...step, branches: newBranches })
      }

      const handleDeleteBranchStep = (branchIndex: number, stepIndex: number) => {
        const newBranches = [...branches]
        newBranches[branchIndex] = newBranches[branchIndex].filter(
          (_, i) => i !== stepIndex
        )
        onChange({ ...step, branches: newBranches })
      }

      const handleDeleteBranch = (branchIndex: number) => {
        const newBranches = branches.filter((_, i) => i !== branchIndex)
        onChange({ ...step, branches: newBranches })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">Race</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="space-y-4">
            {branches.map((branchFlow, bIdx) => (
              <Card key={bIdx} className="p-4 border">
                <div className="flex justify-between items-center mb-2">
                  <div>Gałąź {bIdx + 1}</div>
                  <Button variant="destructive" onClick={() => handleDeleteBranch(bIdx)}>
                    Usuń gałąź
                  </Button>
                </div>

                {branchFlow.map((childStep, sIdx) => (
                  <FlowStepEditor
                    key={sIdx}
                    step={childStep}
                    onChange={(newStep) =>
                      handleBranchStepChange(bIdx, sIdx, newStep)
                    }
                    onDelete={() => handleDeleteBranchStep(bIdx, sIdx)}
                    availableAgentNames={availableAgentNames}
                  />
                ))}

                <Button onClick={() => handleAddStepToBranch(bIdx)}>
                  Dodaj krok w tej gałęzi
                </Button>
              </Card>
            ))}
          </div>

          <Button onClick={handleAddBranch}>Dodaj gałąź wyścigu</Button>
        </Card>
      )
    }

    // ================ CONDITION ================
    case 'condition': {
      const { condition, steps } = step

      const handleConditionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...step, condition: e.target.value })
      }

      const handleStepChange = (index: number, newStep: FlowStep) => {
        const newSteps = [...steps]
        newSteps[index] = newStep
        onChange({ ...step, steps: newSteps })
      }

      const handleDeleteStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index)
        onChange({ ...step, steps: newSteps })
      }

      const handleAddStep = () => {
        onChange({
          ...step,
          steps: [...steps, { type: 'step', agent: '', input: '' }],
        })
      }

      const handleAddSequence = () => {
        onChange({
          ...step,
          steps: [...steps, { type: 'sequence', steps: [] }],
        })
      }

      const handleAddParallel = () => {
        onChange({
          ...step,
          steps: [...steps, { type: 'parallel', branches: [] }],
        })
      }

      const handleAddRace = () => {
        onChange({
          ...step,
          steps: [...steps, { type: 'race', branches: [] }],
        })
      }

      const handleAddCondition = () => {
        onChange({
          ...step,
          steps: [...steps, { type: 'condition', condition: '', steps: [] }],
        })
      }

      const handleAddBranch = () => {
        onChange({
          ...step,
          steps: [
            ...steps,
            { type: 'branch', condition: '', trueFlow: [], falseFlow: [] },
          ],
        })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">Condition</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label className="w-24">Condition:</label>
            <Input
              value={condition}
              onChange={handleConditionChange}
              placeholder="np. userInput === 'ok'"
            />
          </div>

          <div className="ml-4">
            {steps.map((childStep, index) => (
              <FlowStepEditor
                key={index}
                step={childStep}
                onChange={(newStep) => handleStepChange(index, newStep)}
                onDelete={() => handleDeleteStep(index)}
                availableAgentNames={availableAgentNames}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAddStep}>+ step</Button>
            <Button onClick={handleAddSequence}>+ sequence</Button>
            <Button onClick={handleAddParallel}>+ parallel</Button>
            <Button onClick={handleAddRace}>+ race</Button>
            <Button onClick={handleAddCondition}>+ condition</Button>
            <Button onClick={handleAddBranch}>+ branch</Button>
          </div>
        </Card>
      )
    }

    // ================ BRANCH ================
    case 'branch': {
      const { condition, trueFlow, falseFlow } = step

      const handleConditionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...step, condition: e.target.value })
      }

      // TRUE flow
      const handleTrueFlowChange = (index: number, newStep: FlowStep) => {
        const newTrueFlow = [...trueFlow]
        newTrueFlow[index] = newStep
        onChange({ ...step, trueFlow: newTrueFlow })
      }
      const handleDeleteTrueFlowStep = (index: number) => {
        const newTrueFlow = trueFlow.filter((_, i) => i !== index)
        onChange({ ...step, trueFlow: newTrueFlow })
      }

      // FALSE flow
      const handleFalseFlowChange = (index: number, newStep: FlowStep) => {
        const newFalseFlow = [...falseFlow]
        newFalseFlow[index] = newStep
        onChange({ ...step, falseFlow: newFalseFlow })
      }
      const handleDeleteFalseFlowStep = (index: number) => {
        const newFalseFlow = falseFlow.filter((_, i) => i !== index)
        onChange({ ...step, falseFlow: newFalseFlow })
      }

      // Dodawanie kroków do trueFlow
      const addStepToTrueFlow = (newSubStep: FlowStep) => {
        onChange({ ...step, trueFlow: [...trueFlow, newSubStep] })
      }

      // Dodawanie kroków do falseFlow
      const addStepToFalseFlow = (newSubStep: FlowStep) => {
        onChange({ ...step, falseFlow: [...falseFlow, newSubStep] })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">Branch (if / else)</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label className="w-24">Condition:</label>
            <Input
              value={condition}
              onChange={handleConditionChange}
              placeholder="np. userRole === 'admin'"
            />
          </div>

          <div className="flex gap-4">
            {/* TRUE FLOW */}
            <Card className="p-4 border flex-1 space-y-4">
              <div className="font-semibold mb-2">True Flow</div>
              {trueFlow.map((childStep, index) => (
                <FlowStepEditor
                  key={index}
                  step={childStep}
                  onChange={(newStep) => handleTrueFlowChange(index, newStep)}
                  onDelete={() => handleDeleteTrueFlowStep(index)}
                  availableAgentNames={availableAgentNames}
                />
              ))}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    addStepToTrueFlow({ type: 'step', agent: '', input: '' })
                  }
                >
                  + step
                </Button>
                <Button
                  onClick={() =>
                    addStepToTrueFlow({ type: 'sequence', steps: [] })
                  }
                >
                  + sequence
                </Button>
                <Button
                  onClick={() =>
                    addStepToTrueFlow({ type: 'parallel', branches: [] })
                  }
                >
                  + parallel
                </Button>
                <Button
                  onClick={() =>
                    addStepToTrueFlow({ type: 'race', branches: [] })
                  }
                >
                  + race
                </Button>
                <Button
                  onClick={() =>
                    addStepToTrueFlow({
                      type: 'condition',
                      condition: '',
                      steps: [],
                    })
                  }
                >
                  + condition
                </Button>
                <Button
                  onClick={() =>
                    addStepToTrueFlow({
                      type: 'branch',
                      condition: '',
                      trueFlow: [],
                      falseFlow: [],
                    })
                  }
                >
                  + branch
                </Button>
              </div>
            </Card>

            {/* FALSE FLOW */}
            <Card className="p-4 border flex-1 space-y-4">
              <div className="font-semibold mb-2">False Flow</div>
              {falseFlow.map((childStep, index) => (
                <FlowStepEditor
                  key={index}
                  step={childStep}
                  onChange={(newStep) => handleFalseFlowChange(index, newStep)}
                  onDelete={() => handleDeleteFalseFlowStep(index)}
                  availableAgentNames={availableAgentNames}
                />
              ))}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    addStepToFalseFlow({ type: 'step', agent: '', input: '' })
                  }
                >
                  + step
                </Button>
                <Button
                  onClick={() =>
                    addStepToFalseFlow({ type: 'sequence', steps: [] })
                  }
                >
                  + sequence
                </Button>
                <Button
                  onClick={() =>
                    addStepToFalseFlow({ type: 'parallel', branches: [] })
                  }
                >
                  + parallel
                </Button>
                <Button
                  onClick={() =>
                    addStepToFalseFlow({ type: 'race', branches: [] })
                  }
                >
                  + race
                </Button>
                <Button
                  onClick={() =>
                    addStepToFalseFlow({
                      type: 'condition',
                      condition: '',
                      steps: [],
                    })
                  }
                >
                  + condition
                </Button>
                <Button
                  onClick={() =>
                    addStepToFalseFlow({
                      type: 'branch',
                      condition: '',
                      trueFlow: [],
                      falseFlow: [],
                    })
                  }
                >
                  + branch
                </Button>
              </div>
            </Card>
          </div>
        </Card>
      )
    }

    default:
      return null
  }
}
