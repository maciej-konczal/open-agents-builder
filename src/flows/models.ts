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


export type FlowStep =
  | {
      type: 'step'
      agent: string
      input: string
    }
// Simple sequence
  | {
      type: 'sequence'
      steps: FlowStep[]
    }
// Parallel execution of several "sub-flows" (each sub-flow is an array of steps)
  | {
      type: 'parallel'
      branches: FlowStep[][]
    }
// Race – similar to parallel, but completes when the first sub-flow finishes
  | {
      type: 'race'
      branches: FlowStep[][]
    }
// Condition – executes the internal flow if the condition is true
  | {
      type: 'condition'
      condition: string
      steps: FlowStep[]
    }
// Branch – if the condition is true, execute trueFlow, otherwise falseFlow
  | {
      type: 'branch'
      condition: string
      trueFlow: FlowStep[]
      falseFlow: FlowStep[]
    }