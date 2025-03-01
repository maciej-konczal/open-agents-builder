import { Agent, AgentFlow } from "@/data/client/models";
import { AgentDefinition, convertToFlowDefinition, EditorStep, FlowInputVariable } from "@/flows/models";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AgentApiClient } from "@/data/client/agent-api-client";
import { useContext } from "react";
import { DatabaseContext } from "@/contexts/db-context";
import { SaaSContext } from '@/contexts/saas-context';

export function FlowsExecForm({ agent, agentFlow, rootFlow, agents, inputs, flows } :
    { agent: Agent | undefined; agentFlow: AgentFlow | undefined; rootFlow: EditorStep | undefined, flows: AgentFlow[], agents: AgentDefinition[]; inputs: FlowInputVariable[] }) {

    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);
    const { t } = useTranslation();
  return (
    <div>
      <h1>FlowsExecForm</h1>


      <Button onClick={() => {

        const flow = flows.find(f => f.code === agentFlow?.code);

        if (flow) {
            const exec = async () => {
                const apiClient = new AgentApiClient('', dbContext, saasContext);
                const response = await apiClient.exec(agent?.id, flow.code, null);

                console.log(response);
            }

            exec();


        } else {
            toast.error(t('Flow is not defined'));
        }

      }}>Execute</Button>
    </div>
  );
}