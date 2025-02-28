// FlowStepEditor.tsx
'use client'
import React from 'react'
import { EditorStep } from '@/flows/models'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'

interface FlowStepEditorProps {
  step: EditorStep
  onChange: (newStep: EditorStep) => void
  onDelete: () => void
  availableAgentNames: string[]
}

export function FlowStepEditor({
  step,
  onChange,
  onDelete,
  availableAgentNames,
}: FlowStepEditorProps) {

  const { t } = useTranslation();

  if (!step) {
    return <div className="text-sm text-red-500">Brak kroku do wyświetlenia</div>
  }

  switch (step.type) {
    // ----------------------------------
    // STEP
    // ----------------------------------
    case 'step': {
      const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({ ...step, agent: e.target.value })
      }
      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...step, input: e.target.value })
      }

      return (
        <Card className="p-2 my-2 border space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-sm">{t('Step')}</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-20">Agent:</Label>
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
            <Label className="w-20">Input:</Label>
            <Input
              value={step.input}
              onChange={handleInputChange}
              placeholder="Treść inputu..."
            />
          </div>
        </Card>
      )
    }

    // ----------------------------------
    // SEQUENCE
    // ----------------------------------
    case 'sequence': {
      const { steps } = step

      const addStep = (newSub: EditorStep) => {
        onChange({ ...step, steps: [...steps, newSub] })
      }

      const handleChangeAt = (index: number, newS: EditorStep) => {
        const newArr = [...steps]
        newArr[index] = newS
        onChange({ ...step, steps: newArr })
      }

      const handleDeleteAt = (index: number) => {
        onChange({ ...step, steps: steps.filter((_, i) => i !== index) })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">Sequence</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="ml-4">
            {steps.map((child, idx) => (
              <FlowStepEditor
                key={idx}
                step={child}
                onChange={(ns) => handleChangeAt(idx, ns)}
                onDelete={() => handleDeleteAt(idx)}
                availableAgentNames={availableAgentNames}
              />
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Dodaj krok
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addStep({ type: 'step', agent: '', input: '' })}>
                + step
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'sequence', steps: [] })}>
                + sequence
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'parallel', steps: [] })}>
                + parallel
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'oneOf',
                    branches: [{ when: 'condition', flow: { type: 'step', agent: '', input: '' } }],
                  })
                }
              >
                + oneOf
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'forEach',
                    item: 'SomeZodSchemaOrString',
                    inputFlow: { type: 'step', agent: '', input: '' },
                  })
                }
              >
                + forEach
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'evaluator',
                    criteria: '',
                    subFlow: { type: 'step', agent: '', input: '' },
                  })
                }
              >
                + evaluator
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'bestOfAll',
                    criteria: '',
                    steps: [
                      { type: 'step', agent: '', input: '' },
                      { type: 'step', agent: '', input: '' },
                    ],
                  })
                }
              >
                + bestOfAll
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Card>
      )
    }

    // ----------------------------------
    // PARALLEL
    // ----------------------------------
    case 'parallel': {
      const { steps } = step

      const addStep = (newSub: EditorStep) => {
        onChange({ ...step, steps: [...steps, newSub] })
      }

      const handleChangeAt = (index: number, newS: EditorStep) => {
        const newArr = [...steps]
        newArr[index] = newS
        onChange({ ...step, steps: newArr })
      }

      const handleDeleteAt = (index: number) => {
        onChange({ ...step, steps: steps.filter((_, i) => i !== index) })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">Parallel</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="ml-4">
            {steps.map((child, idx) => (
              <FlowStepEditor
                key={idx}
                step={child}
                onChange={(ns) => handleChangeAt(idx, ns)}
                onDelete={() => handleDeleteAt(idx)}
                availableAgentNames={availableAgentNames}
              />
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Dodaj krok
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addStep({ type: 'step', agent: '', input: '' })}>
                + step
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'sequence', steps: [] })}>
                + sequence
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'parallel', steps: [] })}>
                + parallel
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'oneOf',
                    branches: [{ when: 'condition', flow: { type: 'step', agent: '', input: '' } }],
                  })
                }
              >
                + oneOf
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'forEach',
                    item: 'SomeZodSchemaOrString',
                    inputFlow: { type: 'step', agent: '', input: '' },
                  })
                }
              >
                + forEach
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'evaluator',
                    criteria: '',
                    subFlow: { type: 'step', agent: '', input: '' },
                  })
                }
              >
                + evaluator
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'bestOfAll',
                    criteria: '',
                    steps: [
                      { type: 'step', agent: '', input: '' },
                      { type: 'step', agent: '', input: '' },
                    ],
                  })
                }
              >
                + bestOfAll
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Card>
      )
    }

    // ----------------------------------
    // ONE-OF
    // ----------------------------------
    case 'oneOf': {
      const { branches } = step

      const addBranch = () => {
        onChange({
          ...step,
          branches: [
            ...branches,
            {
              when: 'next condition',
              flow: { type: 'step', agent: '', input: '' },
            },
          ],
        })
      }

      const handleChangeBranchCondition = (index: number, newCondition: string) => {
        const newArr = [...branches]
        newArr[index] = { ...newArr[index], when: newCondition }
        onChange({ ...step, branches: newArr })
      }

      const handleChangeBranchFlow = (index: number, newFlow: EditorStep) => {
        const newArr = [...branches]
        newArr[index] = { ...newArr[index], flow: newFlow }
        onChange({ ...step, branches: newArr })
      }

      const handleDeleteBranch = (index: number) => {
        onChange({
          ...step,
          branches: branches.filter((_, i) => i !== index),
        })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">OneOf</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="ml-4 space-y-4">
            {branches.map((br, idx) => (
              <Card key={idx} className="p-2 border space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">When:</Label>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteBranch(idx)}
                  >
                    Usuń branch
                  </Button>
                </div>
                <Input
                  value={br.when}
                  onChange={(e) => handleChangeBranchCondition(idx, e.target.value)}
                />
                <FlowStepEditor
                  step={br.flow}
                  onChange={(nf) => handleChangeBranchFlow(idx, nf)}
                  onDelete={() =>
                    handleChangeBranchFlow(idx, { type: 'step', agent: '', input: '' })
                  }
                  availableAgentNames={availableAgentNames}
                />
              </Card>
            ))}
          </div>

          <Button onClick={addBranch}>Dodaj branch</Button>
        </Card>
      )
    }

    // ----------------------------------
    // FOR-EACH
    // ----------------------------------
    case 'forEach': {
      const { item, inputFlow } = step

      const handleItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...step, item: e.target.value })
      }

      const handleFlowChange = (newFlow: EditorStep) => {
        onChange({ ...step, inputFlow: newFlow })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">ForEach</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-20">item (schema?):</Label>
            <Input value={item} onChange={handleItemChange} />
          </div>

          <div className="ml-4">
            <FlowStepEditor
              step={inputFlow}
              onChange={handleFlowChange}
              onDelete={() =>
                onChange({ ...step, inputFlow: { type: 'step', agent: '', input: '' } })
              }
              availableAgentNames={availableAgentNames}
            />
          </div>
        </Card>
      )
    }

    // ----------------------------------
    // EVALUATOR
    // ----------------------------------
    case 'evaluator': {
      const { criteria, max_iterations, subFlow } = step

      const handleCriteriaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...step, criteria: e.target.value })
      }
      const handleMaxIterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10)
        onChange({ ...step, max_iterations: isNaN(val) ? undefined : val })
      }
      const handleSubFlowChange = (ns: EditorStep) => {
        onChange({ ...step, subFlow: ns })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">Evaluator</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-32">Criteria:</Label>
            <Input value={criteria} onChange={handleCriteriaChange} />
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-32">Max iterations:</Label>
            <Input
              type="number"
              value={max_iterations ?? ''}
              onChange={handleMaxIterChange}
            />
          </div>

          <div className="ml-4">
            <FlowStepEditor
              step={subFlow}
              onChange={handleSubFlowChange}
              onDelete={() =>
                onChange({
                  ...step,
                  subFlow: { type: 'step', agent: '', input: '' },
                })
              }
              availableAgentNames={availableAgentNames}
            />
          </div>
        </Card>
      )
    }

    // ----------------------------------
    // BEST OF ALL
    // ----------------------------------
    case 'bestOfAll': {
      const { criteria, steps } = step

      const handleCriteriaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...step, criteria: e.target.value })
      }
      const handleChangeAt = (idx: number, newSub: EditorStep) => {
        const newArr = [...steps]
        newArr[idx] = newSub
        onChange({ ...step, steps: newArr })
      }
      const handleDeleteAt = (idx: number) => {
        onChange({ ...step, steps: steps.filter((_, i) => i !== idx) })
      }
      const addStep = (newSub: EditorStep) => {
        onChange({ ...step, steps: [...steps, newSub] })
      }

      return (
        <Card className="p-4 my-2 border space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">BestOfAll</div>
            <Button variant="destructive" onClick={onDelete}>
              Usuń
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-32">Criteria:</Label>
            <Input value={criteria} onChange={handleCriteriaChange} />
          </div>

          <div className="ml-4">
            {steps.map((child, idx) => (
              <FlowStepEditor
                key={idx}
                step={child}
                onChange={(ns) => handleChangeAt(idx, ns)}
                onDelete={() => handleDeleteAt(idx)}
                availableAgentNames={availableAgentNames}
              />
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Dodaj krok
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addStep({ type: 'step', agent: '', input: '' })}>
                + step
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'sequence', steps: [] })}>
                + sequence
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'parallel', steps: [] })}>
                + parallel
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'oneOf',
                    branches: [{ when: 'condition', flow: { type: 'step', agent: '', input: '' } }],
                  })
                }
              >
                + oneOf
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'forEach',
                    item: 'SomeZodSchemaOrString',
                    inputFlow: { type: 'step', agent: '', input: '' },
                  })
                }
              >
                + forEach
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'evaluator',
                    criteria: '',
                    subFlow: { type: 'step', agent: '', input: '' },
                  })
                }
              >
                + evaluator
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'bestOfAll',
                    criteria: '',
                    steps: [
                      { type: 'step', agent: '', input: '' },
                      { type: 'step', agent: '', input: '' },
                    ],
                  })
                }
              >
                + bestOfAll
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>        </Card>
      )
    }

    default:
      return <div className="text-red-500">Nieznany typ kroku</div>
  }
}
