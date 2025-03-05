import { AgentFlow } from "@/data/client/models"
import { CoreMessage } from "ai"
import { Flow } from "flows-ai"

// Agent structure
export interface ToolSetting {
    name: string // e.g. "calendarList"
    options: any // object with parameters for the given tool
}

export interface AgentDefinition {
  name: string          // e.g. "npmAgent"
  model: string         // e.g.. "gpt-4o"
  system: string        // prompt
  tools: ToolSetting[]  // name / options dictionary
}

// EditorTypes.ts

export type EditorStep =
  | {
      type: 'step'
      agent: string
      input: string
    }
  | {
      type: 'sequence'
      steps: EditorStep[]
    }
  | {
      type: 'parallel'
      steps: EditorStep[]
    }
  | {
      type: 'oneOf'
      // tablica warunków i sub-flow
      // "branches" to [ {when: string, flow: EditorStep}, ... ]
      branches: {
        when: string
        flow: EditorStep
      }[]
    }
  | {
      type: 'forEach'
      item: string
      inputFlow: EditorStep
    }
  | {
      type: 'evaluator'
      criteria: string
      max_iterations?: number
      subFlow: EditorStep
    }
  | {
      type: 'bestOfAll'
      criteria: string
      steps: EditorStep[]
    };


// convert.ts

/**
 * Funkcja rekurencyjnie konwertująca wewnętrzny EditorStep 
 * na docelowy JSON w formacie flows-ai.
 *
 * W flows-ai:
 *  - sequence => { agent: 'sequenceAgent', input: [...docelowe sub-flows...] }
 *  - parallel => { agent: 'parallelAgent', input: [...sub...] }
 *  - oneOf => { agent: 'oneOfAgent', input: [...], conditions: [...] }
 *  - forEach => { agent: 'forEachAgent', item, input }
 *  - evaluator => { agent: 'optimizeAgent', input, criteria, max_iterations? }
 *  - bestOfAll => { agent: 'bestOfAllAgent', input: [...], criteria }
 *  - step => { agent: 'someUserAgent', input: '...' } (jeśli user agent)
 */
export function convertToFlowDefinition(step: EditorStep): any {
  switch (step.type) {
    // ------------------------------------
    // 1) STEP
    // ------------------------------------
    case 'step':
      return {
        agent: step.agent, // np. "translationAgent"
        input: step.input, // np. "Translate something"
      }

    // ------------------------------------
    // 2) SEQUENCE
    // ------------------------------------
    case 'sequence':
      return {
        agent: 'sequenceAgent',
        input: step.steps.map((child) => convertToFlowDefinition(child)),
      }

    // ------------------------------------
    // 3) PARALLEL
    // ------------------------------------
    case 'parallel':
      return {
        agent: 'parallelAgent',
        input: step.steps.map((child) => convertToFlowDefinition(child)),
      }

    // ------------------------------------
    // 4) ONE-OF
    // ------------------------------------
    case 'oneOf':
      // flows-ai oczekuje: 
      // {
      //   agent: 'oneOfAgent',
      //   input: [FlowDefinition, FlowDefinition, ...],
      //   conditions: [string, string, ...],
      // }
      const flows = step.branches.map((b) => convertToFlowDefinition(b.flow))
      const conds = step.branches.map((b) => b.when)
      console.log('FFF', flows, conds)
      return {
        agent: 'oneOfAgent',
        input: flows,
        conditions: conds,
      }

    // ------------------------------------
    // 5) FOR-EACH
    // ------------------------------------
    case 'forEach':
      // flows-ai forEach => 
      // {
      //   agent: 'forEachAgent',
      //   item: string (lub zod),
      //   input: FlowDefinition
      // }
      return {
        agent: 'forEachAgent',
        item: step.item,
        input: convertToFlowDefinition(step.inputFlow),
      }

    // ------------------------------------
    // 6) EVALUATOR
    // ------------------------------------
    case 'evaluator':
      // flows-ai => 
      // {
      //   agent: 'optimizeAgent',
      //   criteria: "...",
      //   max_iterations: 3,
      //   input: FlowDefinition
      // }
      return {
        agent: 'optimizeAgent',
        criteria: step.criteria,
        max_iterations: step.max_iterations,
        input: convertToFlowDefinition(step.subFlow),
      }

    // ------------------------------------
    // 7) BEST OF ALL
    // ------------------------------------
    case 'bestOfAll':
      // flows-ai => {
      //   agent: 'bestOfAllAgent',
      //   criteria: "...",
      //   input: [FlowDefinition, ...]
      // }
      return {
        agent: 'bestOfAllAgent',
        criteria: step.criteria,
        input: step.steps.map((child) => convertToFlowDefinition(child)),
      }

    default:
      return {}
  }
}


export type FlowInputType =
| 'shortText'
| 'url'
| 'longText'
| 'number'
| 'json'
| 'fileBase64'


export const INPUT_TYPES: { type: FlowInputType, label: string}[] = [
  { type: 'shortText', label: 'Short text' },
  { type: 'url', label: 'URL' },
  { type: 'longText', label: 'Long text' },
  { type: 'number', label: 'Number' },
  { type: 'json', label: 'JSON Object' },
  { type: 'fileBase64', label: 'File (b64)' }
]

export interface FlowInputVariable {
  name: string
  description?: string
  required: boolean
  type: FlowInputType
}


export type FlowStackTraceElement = {
  flow: Flow,
  result?: any;
  messages: CoreMessage[];
  startedAt: Date;
  finishedAt?: Date;
}

export const agentsValidators = ({t, setError}) => {
  return {
    validate: {
      inputs: (v)  => {
        let index = 0;
        for (const agt of (v as AgentDefinition[])) {
          if (!agt.name) {
            setError('agents', {
              message: t('Please set the Names of all Agents')
            })
            return false;
          }
          if (!agt.model) {
            setError('agents', {
              message: t('Please set the Models of all Agents')
            })
            return false;
          }
          index ++;
        }
        return true;
      }
    }
  }
}


export const flowsValidator = ({t, setError}) => {
  return {
    validate: {
      inputs: (v)  => {
        let index = 0;
        for (const flow of (v as AgentFlow[])) {\
          if (!flow.code) {
            setError('inputs', {
              message: t('Please set the Codes of all flows')
            })
            return false;
          }
          if (!flow.name) {
            setError('inputs', {
              message: t('Please set the Names of all flows')
            })
            return false;
          } 
          index ++;
        }
        return true;
      }
    }
  }
}


export const inputValidators = ({t, setError}) => {
    return {
      validate: {
        inputs: (v)  => {
          let index = 0;
          for (const input of (v as FlowInputVariable[])) {
            if (!input.name) {
              setError('inputs', {
                message: t('Please set the Symbols of all variables')
              })
              return false;
            }
            index ++;
          }
          return true;
        }
      }
    }
  }