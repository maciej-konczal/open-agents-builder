import { Agent, AgentFlow } from "@/data/client/models";
import { AgentDefinition, EditorStep, FlowInputVariable } from "@/flows/models";

export function FlowsExecForm({ agentFlow, rootFlow, agents, inputs, flows } :
    { agent: Agent; agentFlow: AgentFlow; rootFlow: EditorStep, flows: AgentFlow[], agents: AgentDefinition[]; inputs: FlowInputVariable[] }) {
  return (
    <div>
      <h1>FlowsExecForm</h1>
    </div>
  );
}