import { Agent, AgentFlow } from "@/data/client/models";
import { AgentDefinition, convertToFlowDefinition, EditorStep, FlowInputVariable } from "@/flows/models";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AgentApiClient } from "@/data/client/agent-api-client";
import { useContext, useEffect, useState } from "react";
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
import { nanoid } from "nanoid";
import { useExecContext } from "@/contexts/exec-context";
import moment from "moment";

export function FlowsExecForm({ agent, agentFlow, agents, inputs, flows } :
    { agent: Agent | undefined; agentFlow: AgentFlow | undefined; rootFlow: EditorStep | undefined, flows: AgentFlow[], agents: AgentDefinition[]; inputs: FlowInputVariable[] }) {

    const [sessionId, setSessionId] = useState<string>(nanoid());
    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const [flowResult, setFlowResult] = useState<any | null>(null);
    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);
    const { t, i18n } = useTranslation();

    const [generalError, setGeneralError] = useState<string | null>(null);
    
    const [executionInProgress, setExecutionInProgress] = useState<boolean>(false);
    const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(agentFlow);


    const getSessionHeaders = () => {
        return {
            'Database-Id-Hash': execContext.databaseIdHash,
            'Agent-Id': execContext.agent?.id ?? '',
            'Agent-Locale': execContext.locale,
            'Agent-Session-Id': execContext.sessionId,
            'Current-Datetime-Iso': moment(new Date()).toISOString(true),
            'Current-Datetime': new Date().toLocaleString(),
            'Current-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    }
       
       
    const execContext = useExecContext();

    useEffect(() => {   
        execContext.init(agent?.id, dbContext?.databaseIdHash, i18n.language, nanoid() /** generate session id */).catch((e) => {
            console.error(e);
            setGeneralError(t(getErrorMessage(e)));
          }).then(() => {
            setIsInitializing(false);
          });
        }, [agent, dbContext?.databaseIdHash, i18n.language]);

  return (
    <Card>
        <CardContent className="p-4">
            {isInitializing ? (
                <div className="text-center">
                    <div className="flex justify-center m-4"><DataLoader /></div>
                    <div className="text-gray-500 text-center">{t("Initializing runtime environment...")}</div>
                </div>
            ) : (
                    generalError ? (
                        <div className="text-center">
                            <div className="flex justify-center m-4 text-red-400 text-2xl">{t('Error')}</div>
                            <div className="text-red-500 text-center">{generalError}</div>
                        </div>
                    ) : (
                        <div className="flex">
                        {executionInProgress ? <DataLoaderIcon /> : null}
                            <Button disabled={executionInProgress} variant={"secondary"} size="sm" onClick={() => {

                            const flow = flows.find(f => f.code === agentFlow?.code);

                            if (flow) {
                                const exec = async () => {
                                    setExecutionInProgress(true);
                                    try {
                                        const apiClient = new AgentApiClient('', dbContext, saasContext);
                                        const response = await apiClient.exec(agent?.id, flow.code, null, getSessionHeaders());

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
                        <div className="ml-2 text-xs h-8 items-center flex">{t('Session Id: ')} {execContext.sessionId}</div>
                    </div>
                    )
                )
            }

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