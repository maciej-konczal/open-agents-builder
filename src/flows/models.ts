import { AgentFlow } from "@/data/client/models"
import { CoreMessage, CoreUserMessage, generateText, streamText } from "ai"
import { Agent, Flow } from "flows-ai"
import s from 'dedent'
import { safeJsonParse } from "@/lib/utils"
import { nanoid } from "nanoid"

export interface Chunk {
  type: string
  flowNodeId?: string;
  agent?: string;
  duration?: number;
  name?: string
  timestamp?: Date
  input?: any
  messages?: Array<{
    role: string
    content: Array<{ type: string; text: string }>
    id?: string
  }>
  result?: string | string[]
  message?: string;
  response?: string
}


// Agent structure
export interface ToolSetting {
  name: string // e.g. "calendarList"
  options: any // object with parameters for the given tool
}

export interface AgentDefinition {
  name: string          // e.g. "npmAgent"
  id?: string;        // optionnal unique agent id for tracing
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
 * Function recursively converting internal EditorStep 
 * to the target JSON format for flows-ai.
 *
 * In flows-ai:
 *  - sequence => { agent: 'sequenceAgent', input: [...target sub-flows...] }
 *  - parallel => { agent: 'parallelAgent', input: [...sub...] }
 *  - oneOf => { agent: 'oneOfAgent', input: [...], conditions: [...] }
 *  - forEach => { agent: 'forEachAgent', item, input }
 *  - evaluator => { agent: 'optimizeAgent', input, criteria, max_iterations? }
 *  - bestOfAll => { agent: 'bestOfAllAgent', input: [...], criteria }
 *  - step => { agent: 'someUserAgent', input: '...' } (if user agent)
 */
export function convertToFlowDefinition(step: EditorStep): any {
  switch (step.type) {
    // ------------------------------------
    // 1) STEP
    // ------------------------------------
    case 'step':
      return {
        id: nanoid(),
        agent: step.agent, // np. "translationAgent"
        input: step.input, // np. "Translate something"
      }

    // ------------------------------------
    // 2) SEQUENCE
    // ------------------------------------
    case 'sequence':
      return {
        id: nanoid(),
        agent: 'sequenceAgent',
        input: step.steps.map((child) => convertToFlowDefinition(child)),
      }

    // ------------------------------------
    // 3) PARALLEL
    // ------------------------------------
    case 'parallel':
      return {
        id: nanoid(),
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
      return {
        id: nanoid(),
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
        id: nanoid(),
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
        id: nanoid(),
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
        id: nanoid(),
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


export const INPUT_TYPES: { type: FlowInputType, label: string }[] = [
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

export const agentsValidators = ({ t, setError }) => {
  return {
    validate: {
      inputs: (v) => {
        let index = 0;
        const agents = (v as AgentDefinition[]);
        for (const agt of agents) {
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
          if (agents.filter(vv => vv.name == agt.name).length > 1) {
            setError('agents', {
              message: t('The agent names must be unique')
            })
            return false;
          }
          index++;
        }
        return true;
      }
    }
  }
}


export const flowsValidators = ({ t, setError }) => {
  return {
    validate: {
      inputs: (v) => {
        let index = 0;
        for (const flow of (v as AgentFlow[])) {
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
          index++;
        }
        return true;
      }
    }
  }
}


export const inputValidators = ({ t, setError }) => {
  return {
    validate: {
      inputs: (v) => {
        let index = 0;
        const variables = (v as FlowInputVariable[])
        for (const input of variables) {
          if (!input.name) {
            setError('inputs', {
              message: t('Please set the Symbols of all variables')
            })
            return false;
          }
          if (variables.filter(vv => vv.name == input.name).length > 1) {
            setError('inputs', {
              message: t('The input names must be unique')
            })
            return false;
          }
          index++;
        }
        return true;
      }
    }
  }
}


/**
 * Helper function to create a user-defined agent that can then be referneced in a flow.
 * Like `generateText` in Vercel AI SDK, but we're taking care of `prompt`.
 */
export function messagesSupportingAgent({ maxSteps = 10, streaming = false, name ="", id = nanoid(), onDataChunk = null, ...rest }: Parameters<typeof generateText>[0] & {  name: string, id: string, streaming: boolean, onDataChunk: (((data: Chunk) => void) | null) }): Agent {
  return async ({ input }, context) => {
    if (typeof input === 'string') {
      const objInput = safeJsonParse(input, null)
      if (objInput && objInput.role) // this is a workaround for the case when the input is a message
      {
        const messages = [objInput, {
          role: 'user',
          content: [{
            type: 'text',
            text: `Here is the context: ${JSON.stringify(context)}`
          }]
        }] as CoreUserMessage[];

        delete (rest.prompt);

        if(onDataChunk) onDataChunk({
          type: "generationStart",
          name,
          flowNodeId: id,
          timestamp: new Date(),          
        });

        if (!streaming) {
          const response = await generateText({
            ...rest,
            maxSteps,
            messages
          })
          return response.text
        } else {
          const { textStream } = streamText({
            ...rest,
            maxSteps,
            messages
          });

          let response = '';
          for await (const textPart of textStream) {
            response += textPart;
            if (onDataChunk) {
              onDataChunk({ type: 'textStream', flowNodeId: id, result: textPart, timestamp: new Date() });
            }
          }

          return response;

        }
      }

      // default flow

      if(onDataChunk) onDataChunk({
        type: "generationStart",
        name,
        flowNodeId: id,
        timestamp: new Date(),          
      });

      if (!streaming) {
        const response = await generateText({
          ...rest,
          maxSteps,
          prompt: s`
              Here is the context: ${JSON.stringify(context)}
              Here is the instruction: ${JSON.stringify(input)}
            `,
        })
        return response.text
      } else {
        const { textStream } = await streamText({
          ...rest,
          maxSteps,
          prompt: s`
              Here is the context: ${JSON.stringify(context)}
              Here is the instruction: ${JSON.stringify(input)}
            `,
        })
        let response = '';
        for await (const textPart of textStream) {
          response += textPart;
          if (onDataChunk) {
            onDataChunk({ type: 'textStream', agentId: id, result: textPart, timestamp: new Date() });
          }
        }
        return response;
      }
    }
  }

}
