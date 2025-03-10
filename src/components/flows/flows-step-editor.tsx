// FlowStepEditor.tsx
'use client'
import React from 'react'
import { EditorStep, FlowInputVariable } from '@/flows/models'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { GitBranchIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '../ui/textarea'
import { Mention } from 'primereact/mention';

interface FlowStepEditorProps {
  step: EditorStep
  onChange: (newStep: EditorStep) => void
  onDelete: () => void
  onNoAgentsError?: () => void
  inputs: FlowInputVariable[]
  availableAgentNames: string[]
}

export function FlowStepEditor({
  step,
  onChange,
  onDelete,
  availableAgentNames,
  onNoAgentsError,
  inputs
}: FlowStepEditorProps) {

  const { t } = useTranslation();

  const [suggestions, setSuggestions] = React.useState<FlowInputVariable[]>([]);
  const onSearch = (event) => {
    //in a real application, make a request to a remote url with the query and return suggestions, for demo we filter at client side
    setTimeout(() => {
        const query = event.query;
        let suggestions;

        if (!query.trim().length) {
            suggestions = [...inputs];
        }
        else {
            suggestions = inputs.filter((inputs) => {
                return inputs.name.toLowerCase().startsWith(query.toLowerCase());
            });
        }

        setSuggestions(suggestions);
    }, 250);
}

const itemTemplate = (suggestion: FlowInputVariable) => {
    return (
        <div className="flex align-items-center p-2 text-sm bg-background">
            <span className="flex flex-column ml-2">
                @{suggestion.description ? suggestion.description : suggestion.name}
            </span>
        </div>
    );
}
 


  if (!step) {
    return <div className="text-sm text-red-500">{t('No steps to display')}</div>
  }

  switch (step.type) {
    // ----------------------------------
    // STEP
    // ----------------------------------
    case 'step': {
      const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({ ...step, agent: e.target.value })
      }
      const handleInputChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onChange({ ...step, agent: step.agent, input: e.target.value })
      }

      return (
        <Card className="p-2 my-2 border space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-sm">{t('Step')}</div>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-20">{t('Agent')}:</Label>
            <select
              className="border p-2 rounded text-sm"
              value={step.agent ? step.agent : (availableAgentNames.length > 0 ? availableAgentNames[0] : '')}
              onChange={handleAgentChange}
            >
              <option value="">{t('Select agent')}</option>
              {availableAgentNames.map((agentName) => (
                <option key={agentName} value={agentName}>
                  {agentName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-20">{t('Prompt')}</Label>
            <Mention
              autoResize
              rows={5} 
              field="name"
              inputClassName="w-full p-2 border border-input bg-background rounded-md"
              panelClassName="rounded-md border border-input bg-background"
              itemTemplate={itemTemplate}
              className="text-sm w-full p-2 flex"
              suggestions={suggestions}
              onSearch={onSearch}
              trigger={['@', '#']}
              value={step.input} 
              onChange={handleInputChange}
              placeholder={t("AI instruction or other input you'd like to pass to this Agent use @variableName to input the specific variables into context")}
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
        if (availableAgentNames.length === 0) {
            toast.error(t('Please add at least one sub-agent first'))
            if (onNoAgentsError) {
                onNoAgentsError()
            }
            return;
        }
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
        <Card className="p-2 my-2 border space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-m ml-2">{t('Sequence')}</div>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="ml-2">
            {steps.map((child, idx) => (
              <FlowStepEditor
                inputs={inputs}
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
                <PlusIcon className="w-4 h-4" />{t('Add step')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addStep({ type: 'step', agent: availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : '', input: '' })}>
                {t('+ step')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'sequence', steps: [] })}>
                {t('+ sequence')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'parallel', steps: [] })}>
                {t('+ parallel')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'oneOf',
                    branches: [{ when: 'condition', flow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' } }],
                  })
                }
              >
                {t('+ oneOf')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'forEach',
                    item: t('Zod schema, or string describing the input structure'),
                    inputFlow: { type: 'sequence', steps: [] },
                  })
                }
              >
                {t('+ forEach')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'evaluator',
                    criteria: '',
                    subFlow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                  })
                }
              >
                {t('+ evaluator')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'bestOfAll',
                    criteria: '',
                    steps: [
                      { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                      { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                    ],
                  })
                }
              >
                {t('+ bestOfAll')}
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
        if (availableAgentNames.length === 0) {
            if (onNoAgentsError) {
                onNoAgentsError()
            }            
            toast.error(t('Please add at least one sub-agent first'))
            return;
        }        
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
        <Card className="my-2 p-2 border space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-m ml-2">{t('Parallel')}</div>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="ml-2">
            {steps.map((child, idx) => (
              <FlowStepEditor
                inputs={inputs}
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
                <PlusIcon className="w-4 h-4" />{t('Add step')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addStep({ type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' })}>
                {t('+ step')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'sequence', steps: [] })}>
                {t('+ sequence')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'parallel', steps: [] })}>
                {t('+ parallel')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'oneOf',
                    branches: [{ when: 'condition', flow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' } }],
                  })
                }
              >
                {t('+ oneOf')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'forEach',
                    item: t('Zod schema, or string describing the input structure'),
                    inputFlow: { type: 'sequence', steps: []},
                  })
                }
              >
                {t('+ forEach')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'evaluator',
                    criteria: '',
                    subFlow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                  })
                }
              >
                {t('+ evaluator')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'bestOfAll',
                    criteria: '',
                    steps: [
                      { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                      { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                    ],
                  })
                }
              >
                {t('+ bestOfAll')}
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

  // Dodajemy branch, wybierając typ sub-flow z dropdownu
  const addBranch = (flowType: EditorStep['type']) => {
    // W zależności od flowType tworzymy obiekt sub-flow
    let newFlow: EditorStep
    switch (flowType) {
      case 'step':
        newFlow = { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' }
        break
      case 'sequence':
        newFlow = { type: 'sequence', steps: [] }
        break
      case 'parallel':
        newFlow = { type: 'parallel', steps: [] }
        break
      case 'oneOf':
        newFlow = {
          type: 'oneOf',
          branches: [
            {
              when: 'condition',
              flow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
            },
          ],
        }
        break
      case 'forEach':
        newFlow = {
          type: 'forEach',
          item: t('Zod schema, or string describing the input structure'),
          inputFlow: { type: 'sequence', steps: []},
        }
        break
      case 'evaluator':
        newFlow = {
          type: 'evaluator',
          criteria: '',
          subFlow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
        }
        break
      case 'bestOfAll':
        newFlow = {
          type: 'bestOfAll',
          criteria: '',
          steps: [
            { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
            { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
          ],
        }
        break
      default:
        // na wszelki wypadek
        newFlow = { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' }
        break
    }

    const newBranch = {
      when: 'next condition',
      flow: newFlow,
    }
    onChange({
      ...step,
      branches: [...branches, newBranch],
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
    <Card className="p-2 my-2 border space-y-2">
      <div className="flex justify-between items-center">
        <div className="font-semibold text-m">{t('OneOf')}</div>
        <Button variant="outline" size="sm" onClick={onDelete}>
              <TrashIcon className="w-4 h-4" />
            </Button>
      </div>

      <div className="ml-2 space-y-2">
        {branches.map((br, idx) => (
          <Card key={idx} className="p-2 border space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">{t('When')}:</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteBranch(idx)}
              >
                <TrashIcon />
              </Button>
            </div>

            <Mention
              autoResize
              rows={5} 
              field="name"
              inputClassName="w-full p-2 border border-input bg-background rounded-md"
              panelClassName="rounded-md border border-input bg-background"
              itemTemplate={itemTemplate}
              className="text-sm w-full p-2 flex"
              suggestions={suggestions}
              onSearch={onSearch}
              trigger={['@', '#']}
              value={br.when} 
              onChange={(e) => handleChangeBranchCondition(idx, e.target.value)}
              placeholder={t("AI instruction for evaluating criteria, you may use @variableName to input the specific variables into context")}
            />            

            <FlowStepEditor
              inputs={inputs}
              step={br.flow}
              onChange={(nf) => handleChangeBranchFlow(idx, nf)}
              onDelete={() =>
                handleChangeBranchFlow(idx, { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' })
              }
              availableAgentNames={availableAgentNames}
            />
          </Card>
        ))}
      </div>

      {/* Zamiast zwykłego buttona "Dodaj branch" -> dropdown z typami */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <GitBranchIcon className="w-4 h-4" /> {t('Add branch...')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => addBranch('step')}>{t('+ step')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => addBranch('sequence')}>{t('+ sequence')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => addBranch('parallel')}>{t('+ parallel')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => addBranch('oneOf')}>{t('+ oneOf')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => addBranch('forEach')}>{t('+ forEach')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => addBranch('evaluator')}>{t('+ evaluator')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => addBranch('bestOfAll')}>{t('+ bestOfAll')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  )
}


    // ----------------------------------
    // FOR-EACH
    // ----------------------------------
    case 'forEach': {
      const { item, inputFlow } = step

      const handleItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onChange({ ...step, item: e.target.value })
      }

      const handleFlowChange = (newFlow: EditorStep) => {
        onChange({ ...step, inputFlow: newFlow })
      }

      return (
        <Card className="p-2 my-2 border space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-m ml-2">{t('ForEach')}</div>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-20">{t('schema')}</Label>
            <Textarea value={item} onChange={handleItemChange} />
          </div>

          <div className="ml-2">
            <FlowStepEditor
              inputs={inputs}
              step={inputFlow}
              onChange={handleFlowChange}
              onDelete={() =>
                onChange({ ...step, inputFlow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' } })
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
        <Card className="p-2 my-2 border space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-m ml-2">{t('Evaluator')}</div>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-32">{t('Criteria')}:</Label>
            <Mention
              autoResize
              rows={5} 
              field="name"
              inputClassName="w-full p-2 border border-input bg-background rounded-md"
              panelClassName="rounded-md border border-input bg-background"
              itemTemplate={itemTemplate}
              className="text-sm w-full p-2 flex"
              suggestions={suggestions}
              onSearch={onSearch}
              trigger={['@', '#']}
              value={step.criteria} 
              onChange={handleCriteriaChange}
              placeholder={t("AI instruction for evaluating criteria, you may use @variableName to input the specific variables into context")}
            />

          </div>

          <div className="flex items-center gap-2">
            <Label className="w-32">{t('Max iterations')}:</Label>
            <Input
              type="number"
              value={max_iterations ?? ''}
              onChange={handleMaxIterChange}
            />
          </div>

          <div className="ml-2">
            <FlowStepEditor
              inputs={inputs}
              step={subFlow}
              onChange={handleSubFlowChange}
              onDelete={() =>
                onChange({
                  ...step,
                  subFlow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
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
        <Card className="p-2 my-2 border space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-m">{t('BestOfAll')}</div>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-32">{t('Criteria')}:</Label>

            <Mention
              autoResize
              rows={5} 
              field="name"
              inputClassName="w-full p-2 border border-input bg-background rounded-md"
              panelClassName="rounded-md border border-input bg-background"
              itemTemplate={itemTemplate}
              className="text-sm w-full p-2 flex"
              suggestions={suggestions}
              onSearch={onSearch}
              trigger={['@', '#']}
              value={step.criteria} 
              onChange={handleCriteriaChange}
              placeholder={t("AI instruction for evaluating criteria, you may use @variableName to input the specific variables into context")}
            />

          </div>

          <div className="ml-2">
            {steps.map((child, idx) => (
              <FlowStepEditor
                inputs={inputs}
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
                <PlusIcon className="w-4 h-4" /> {t('Add step')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => addStep({ type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' })}>
                {t('+ step')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'sequence', steps: [] })}>
                {t('+ sequence')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addStep({ type: 'parallel', steps: [] })}>
                {t('+ parallel')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'oneOf',
                    branches: [{ when: 'condition', flow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' } }],
                  })
                }
              >
                {t('+ oneOf')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'forEach',
                    item: t('Zod schema, or string describing the input structure'),
                    inputFlow: { type: 'sequence', steps: []},
                  })
                }
              >
                {t('+ forEach')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'evaluator',
                    criteria: '',
                    subFlow: { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                  })
                }
              >
                {t('+ evaluator')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  addStep({
                    type: 'bestOfAll',
                    criteria: '',
                    steps: [
                      { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                      { type: 'step', agent: (availableAgentNames && availableAgentNames.length > 0 ? availableAgentNames[0] : ''), input: '' },
                    ],
                  })
                }
              >
                {t('+ bestOfAll')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>        </Card>
      )
    }

    default:
      return <div className="text-red-500">{t('Unknown step')}</div>
  }
}
