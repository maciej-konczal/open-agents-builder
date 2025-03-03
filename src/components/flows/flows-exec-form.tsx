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
import { PlayIcon } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";
import DataLoader from "../data-loader";
import { Card, CardContent } from "../ui/card";
import { DataLoaderIcon } from "../data-loader-icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function FlowsExecForm({ agent, agentFlow, agents, inputs, flows } :
    { agent: Agent | undefined; agentFlow: AgentFlow | undefined; rootFlow: EditorStep | undefined, flows: AgentFlow[], agents: AgentDefinition[]; inputs: FlowInputVariable[] }) {

    const [flowResult, setFlowResult] = useState<any | null>(null);
    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);
    const { t } = useTranslation();
    
    const [executionInProgress, setExecutionInProgress] = useState<boolean>(false);
    const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(agentFlow);

  return (
    <Card>
        <CardContent className="p-4">
            <div className="flex">
            {executionInProgress ? <DataLoaderIcon /> : null}
                <Button disabled={executionInProgress} variant={"secondary"} size="sm" onClick={() => {

                const flow = flows.find(f => f.code === agentFlow?.code);

                if (flow) {
                    const exec = async () => {
                        setExecutionInProgress(true);
                        try {
                            const apiClient = new AgentApiClient('', dbContext, saasContext);
                            const response = await apiClient.exec(agent?.id, flow.code, null);

                            setFlowResult(response);
                            console.log(response);
                        } catch (e) {
                            toast.error(t('Failed to execute flow: ') + getErrorMessage(e));
                            console.error(e);
                        }
                        setExecutionInProgress(false);
                    }

                    exec();


                } else {
                    toast.error(t('Flow is not defined'));
                }

            }}><PlayIcon className="w-4 h-4"/>{t('Execute')}</Button>
        </div>

        {flowResult ? (
            <Accordion type="multiple" className="w-full mt-4">
                <AccordionItem value={"result"}>
                    <AccordionTrigger>{t('Result')}</AccordionTrigger>
                    <AccordionContent>
                        {(typeof flowResult === 'string') ? <ChatMessageMarkdown>{flowResult}</ChatMessageMarkdown> :
                            <JsonView value={flowResult} />}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value={"trace"}>
                    <AccordionTrigger>{t('Trace')}</AccordionTrigger>
                    <AccordionContent>
                        <JsonView value={flowResult.trace} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        ) : null}

        </CardContent>  

        

    </Card>
  );
}