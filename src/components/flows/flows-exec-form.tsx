import { Agent, AgentFlow } from "@/data/client/models";
import { AgentDefinition, convertToFlowDefinition, EditorStep, FlowInputVariable } from "@/flows/models";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AgentApiClient } from "@/data/client/agent-api-client";
import { useContext, useState } from "react";
import { DatabaseContext } from "@/contexts/db-context";
import { SaaSContext } from '@/contexts/saas-context';
import JsonView from "@uiw/react-json-view";
import { ChatMessageMarkdown } from "../chat-message-markdown";

export function FlowsExecForm({ agent, agentFlow, agents, inputs, flows } :
    { agent: Agent | undefined; agentFlow: AgentFlow | undefined; rootFlow: EditorStep | undefined, flows: AgentFlow[], agents: AgentDefinition[]; inputs: FlowInputVariable[] }) {

    const [flowResult, setFlowResult] = useState<any | null>(null);
    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);
    const { t } = useTranslation();

    const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(agentFlow);

  return (
    <div>
      <h2>{t('Flows Debugger')}</h2>
      <div>
      {flows?.length > 0 && (
          <select className="form-select w-full" value={currentFlow?.code ?? agentFlow?.code ?? agent?.defaultFlow ?? ''} onChange={(e) => {
            const flow = flows.find(f => f.code === e.target.value);
            if (flow) {
              setCurrentFlow(flow);
            }
          }}>
            {flows.map((flow, index) => (
              <option key={index} value={flow.code}>{flow.name}</option>
            ))}
          </select>
        )}
      </div>


      <Button onClick={() => {

        const flow = flows.find(f => f.code === agentFlow?.code);

        if (flow) {
            const exec = async () => {
                const apiClient = new AgentApiClient('', dbContext, saasContext);
                const response = await apiClient.exec(agent?.id, flow.code, null);

                setFlowResult(response);
                console.log(response);
            }

            exec();


        } else {
            toast.error(t('Flow is not defined'));
        }

      }}>Execute</Button>

      {flowResult ? (
        (typeof flowResult === 'string') ? <ChatMessageMarkdown>{flowResult}</ChatMessageMarkdown> :
               <JsonView value={flowResult} />
      ) : null}


    </div>
  );
}