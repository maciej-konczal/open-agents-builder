"use client";
import { useTranslation } from "react-i18next";
import { useAgentContext } from "@/contexts/agent-context";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { onAgentSubmit } from "../general/page";
import { AgentStatus } from "@/components/layout/agent-status";
import React, { use, useContext, useEffect, useState } from "react";
import {
  AgentDefinition,
  agentsValidators,
  flowsValidators,
  EditorStep,
  FlowInputVariable,
  inputValidators,
} from "@/flows/models";
import FlowBuilder from "@/components/flows/flows-builder";
import { AgentFlow } from "@/data/client/models";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogTrigger,
  Dialog,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  NetworkIcon,
  PlayIcon,
  TextIcon,
  VariableIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react";
import { safeJsonParse } from "@/lib/utils";
import { set } from "date-fns";
import {
  ExecFormDisplayMode,
  FlowsExecForm,
} from "@/components/flows/flows-exec-form";
import {
  Accordion,
  AccordionContent,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AccordionItem } from "@radix-ui/react-accordion";
import { FlowInputVariablesEditor } from "@/components/flows/flows-input-variables-editor";
import { FlowAgentsEditor } from "@/components/flows/flows-agent-editor";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ExecProvider } from "@/contexts/exec-context";
import { Input } from "@/components/ui/input";
import { FlowsDeleteDialog } from "@/components/flows/flows-delete-dialog";
import DataLoader from "@/components/data-loader";
import { DatabaseContext } from "@/contexts/db-context";
import { is } from "drizzle-orm";
import {
  ElevenLabsApiClient,
  ElevenLabsTool,
} from "@/data/client/elevenlabs-api-client";
import { SaaSContext } from "@/contexts/saas-context";

export default function FlowsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { current: agent, dirtyAgent, status, updateAgent } = useAgentContext();
  const dbContext = useContext(DatabaseContext);
  const saasContext = useContext(SaaSContext);
  const setupElevenLabsClient = async (): Promise<ElevenLabsApiClient> => {
    const encryptionConfig = {
      secretKey: dbContext?.masterKey,
      useEncryption: false,
    };
    return new ElevenLabsApiClient(
      "",
      dbContext,
      saasContext,
      encryptionConfig
    );
  };
  const [elevenLabsClient, setElevenLabsClient] =
    useState<ElevenLabsApiClient | null>(null);

  const [editFlowDialogOpen, setEditFlowDialogOpen] = useState<boolean>(false);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  const [dataLoaderVisible, setDataLoaderVisible] = useState<boolean>(true);
  const [executeFlowDialogOpen, setExecuteFlowDialogOpen] =
    useState<boolean>(false);
  const [createElevenLabsDialogOpen, setCreateElevenLabsDialogOpen] =
    useState<boolean>(false);
  const [elevenLabsError, setElevenLabsError] = useState<string>("");
  const [isCreatingAgent, setIsCreatingAgent] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
    setError,
  } = useForm({
    defaultValues: agent ? agent.toForm(null) : {},
  });

  const [editFlowId, setEditFlowId] = useState<number>(-1);
  const [editFlowName, setEditFlowName] = useState<string>("");
  const [editFlowError, setAddFlowError] = useState<string>("");
  const [editFlowCode, setEditFlowCode] = useState<string>("");
  const [currentTabs, setCurrentTabs] = useState<string[]>([]);

  const agents = watch("agents") ?? [];
  const defaultFlow = watch("defaultFlow") ?? "";

  const flows = watch("flows") ?? ([] as AgentFlow[]);
  const [rootFlow, setRootFlow] = useState<EditorStep | undefined>(undefined);
  const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(
    undefined
  );
  const [inputs, setInputs] = useState<FlowInputVariable[]>([]);

  const onFlowChanged = (value: EditorStep) => {
    if (rootFlow) {
      setRootFlow(value);
    }
  };

  const onAgentsChanged = (value: AgentDefinition[]) => {
    setValue("agents", value);
  };

  register("defaultFlow");
  register(
    "inputs",
    inputValidators({
      inputs: () => {
        return inputs;
      },
      t,
      setError,
    })
  );
  register("agents", agentsValidators({ t, setError }));
  register("flows", flowsValidators({ t, setError }));

  const onVariablesChanged = (value: FlowInputVariable[]) => {
    setInputs(value);
  };

  useEffect(() => {
    if (rootFlow && currentFlow) {
      setInitialLoadDone(true);
      setValue(
        "flows",
        flows.map((f) =>
          f.code === currentFlow.code ? { ...f, flow: rootFlow, inputs } : f
        )
      );
    }
  }, [rootFlow, currentFlow, inputs]);

  useEffect(() => {
    const savedFlow = safeJsonParse(
      sessionStorage.getItem("currentFlow") ?? "",
      null
    );

    if (flows && flows.length > 0 && !initialLoadDone) {
      if (savedFlow || defaultFlow) {
        const flow = savedFlow
          ? flows.find((f) => f.code === savedFlow.code)
          : flows.find((f) => f.code === defaultFlow);
        if (flow) {
          setRootFlow(flow.flow);
          setCurrentFlow(flow);
          setInputs(flow.inputs ?? []);
        } else {
          setRootFlow(flows[0].flow);
          setCurrentFlow(flows[0]);
          setInputs(flows[0].inputs ?? []);
        }
      } else {
        setRootFlow(flows[0].flow);
        setCurrentFlow(flows[0]);
        setInputs(flows[0].inputs ?? []);
      }
    }

    setDataLoaderVisible(false);
  }, [flows, initialLoadDone]);

  useEffect(() => {
    if (currentFlow) {
      currentFlow.inputs = inputs;
      sessionStorage.setItem("currentFlow", JSON.stringify(currentFlow));
    }
  }, [currentFlow, inputs]);

  useEffect(() => {
    setupElevenLabsClient().then(setElevenLabsClient);
  }, [dbContext, saasContext]);

  const { onSubmit, isDirty } = onAgentSubmit(
    agent,
    watch,
    setValue,
    getValues,
    updateAgent,
    t,
    router,
    {}
  );

  const createElevenLabsAgent = async () => {
    if (!currentFlow || !elevenLabsClient) return;

    setIsCreatingAgent(true);
    setElevenLabsError("");

    try {
      // Create tools configuration based on available sub-agents
      const tools: ElevenLabsTool[] = [];

      // = agents.map((agent: AgentDefinition) => ({
      //   name: agent.name,
      //   webhook: agent.name,
      //   description: agent.description || `Tool to interact with ${agent.name}`,
      //   api_schema: {
      //     url: "https://c92c-194-233-101-45.ngrok-free.app",
      //     method: "POST",
      //     request_body_schema: {
      //       type: "object",
      //       properties: {
      //         userEmail: {
      //           type: "string",
      //           description: "User email address.",
      //           dynamic_variable: "",
      //           constant_value: "",
      //         },
      //         productCode: {
      //           type: "string",
      //           description: "Product code.",
      //           dynamic_variable: "",
      //           constant_value: "",
      //         },
      //         amountOfProduct: {
      //           type: "number",
      //           description: "Amount of product to be delivered.",
      //           dynamic_variable: "",
      //           constant_value: "",
      //         },
      //       },
      //       required: ["userEmail", "productCode", "amountOfProduct"],
      //       description:
      //         "Carefully collect all necessary data. Ask if you are not sure.",
      //     },
      //   },
      // }));

      tools.push({
        type: "system",
        name: "end_call",
        description: "",
        params: {
          system_tool_type: "end_call",
        },
      });

      const promptText = `You are a helpful assistant handling the following flow: ${currentFlow.description || currentFlow.name}

Available tools:
${tools
  .map((tool: ElevenLabsTool) => {
    if (tool.type === "system") {
      return `- ${tool.name}: System tool to ${tool.name === "end_call" ? "end the conversation" : tool.description}`;
    } else {
      const schema = tool.api_schema?.request_body_schema;
      const params = schema
        ? Object.entries(schema.properties)
            .map(([key, value]) => `    - ${key}: ${value.description}`)
            .join("\n")
        : "";

      return `- ${tool.name}: ${tool.description}
    Required parameters:
${params}
    Before using this tool, make sure to collect all required information from the user.`;
    }
  })
  .join("\n")}

Instructions:
1. Your goal is to help users interact with the available tools.
2. For each tool call, make sure to collect all required parameters from the user first.
3. Ask clarifying questions if any required information is missing or unclear.
4. After using a webhook tool, confirm the action with the user and share any response/order ID received.
5. Use the end_call tool when the conversation is complete.`;

      const response = await elevenLabsClient.createAgent({
        agentName: currentFlow.name,
        promptText: promptText,
        firstMessage: "Hey, whats up?", // from the flow config / field
        tools,
      });

      // Update the current flow with the ElevenLabs agent ID
      const updatedFlows = flows.map((f: AgentFlow) =>
        f.code === currentFlow.code
          ? { ...f, elevenLabsAgentId: response.agent_id }
          : f
      );

      setValue("flows", updatedFlows);
      await handleSubmit(onSubmit)(); // Save the changes
      setCreateElevenLabsDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create ElevenLabs agent";
      setElevenLabsError(errorMessage);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  return (
    <div className="space-y-6">
      {isDirty ? (
        <AgentStatus
          status={{
            id: "dirty",
            message: t("You have unsaved changes"),
            type: "warning",
          }}
        />
      ) : (
        <AgentStatus status={status} />
      )}

      <div>
        {flows?.length > 0 && (
          <select
            className="form-select text-sm w-full mb-2 p-2 rounded border"
            value={currentFlow?.code ?? defaultFlow}
            onChange={(e) => {
              const flow = flows.find((f) => f.code === e.target.value);
              if (flow) {
                setRootFlow(flow.flow);
                setCurrentFlow(flow);
                setInputs(flow.inputs);
              }
            }}
          >
            {flows.map((flow, index) => (
              <option key={index} value={flow.code}>
                {flow.name}{" "}
                {flow.elevenLabsAgentId ? "(ElevenLabs enabled)" : ""}
              </option>
            ))}
          </select>
        )}
        <Dialog open={editFlowDialogOpen} onOpenChange={setEditFlowDialogOpen}>
          <DialogContent>
            <div className="space-y-4 p-4">
              <h3 className="font-bold text-m">{t("Add new flow")}</h3>
              {editFlowError && (
                <div className="text-red-500 text-sm p-4 border border-red-500 bg-red-200">
                  {editFlowError}
                </div>
              )}

              <div>
                <label className="text-sm">{t("Flow name")}</label>
                <Input
                  type="text"
                  placeholder={t("Flow name")}
                  className="form-input w-full text-sm"
                  value={editFlowName}
                  onChange={(e) => setEditFlowName(e.target.value)}
                />
              </div>

              <div>
                <label className="mt-4 text-sm">{t("Flow code")}</label>
                <Input
                  type="text"
                  placeholder={t("Flow code")}
                  className="form-input w-full text-sm"
                  value={editFlowCode}
                  onChange={(e) => setEditFlowCode(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end p-4">
              <Button
                onClick={() => {
                  let error = "";

                  if (editFlowCode) {
                    if (editFlowId < 0)
                      if (flows && flows.find((f) => f.code === editFlowCode)) {
                        error = t("Flow with this code already exists");
                      }
                  } else {
                    error = t("Flow code is required");
                  }

                  if (!editFlowName) {
                    error = t("Flow name is required");
                  }

                  if (!error) {
                    let newFlows = null;
                    if (editFlowId >= 0) {
                      newFlows = flows.map((f, index) =>
                        index === editFlowId
                          ? {
                              name: editFlowName,
                              code: editFlowCode,
                              flow: f.flow,
                            }
                          : f
                      );
                    } else {
                      newFlows = [
                        ...flows,
                        {
                          name: editFlowName,
                          code: editFlowCode,
                          flow: { type: "sequence", steps: [] },
                        },
                      ];
                    }

                    setValue("flows", newFlows);

                    if (!defaultFlow)
                      setValue(
                        "defaultFlow",
                        newFlows[newFlows.length - 1].code
                      );

                    setRootFlow(newFlows[newFlows.length - 1].flow);
                    setCurrentFlow(newFlows[newFlows.length - 1]);
                    setInputs(newFlows[newFlows.length - 1].inputs);

                    setEditFlowDialogOpen(false);
                  } else {
                    setAddFlowError(error);
                  }
                }}
              >
                {t("Save changes")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditFlowCode("");
            setEditFlowName("");
            setEditFlowId(-1);
            setEditFlowDialogOpen(true);
          }}
          className="mb-2"
        >
          <NetworkIcon className="w-4 h-4" />
          {t("Add flow")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditFlowCode(currentFlow?.code ?? "");
            setEditFlowName(currentFlow?.name ?? "");
            setEditFlowId(
              flows.findIndex((f) => f.code === currentFlow?.code) ?? -1
            );
            setEditFlowDialogOpen(true);
          }}
          className="ml-2 mb-2"
          title={t("Rename flow...")}
        >
          <TextIcon className="w-4 h-4" />
        </Button>

        {currentFlow && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setValue("defaultFlow", currentFlow?.code)}
            className="ml-2 mb-2"
          >
            <ZapIcon className="w-4 h-4" />
            {t("Set as default flow")}
          </Button>
        )}
        {currentFlow && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentTabs(["debugger"])}
            className="ml-2 mb-2"
          >
            <ZapIcon className="w-4 h-4" />
            {t("Execute")}
          </Button>
        )}

        {currentFlow && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateElevenLabsDialogOpen(true)}
            className="ml-2 mb-2"
            disabled={!!currentFlow.elevenLabsAgentId}
          >
            <ZapIcon className="w-4 h-4" />
            {currentFlow.elevenLabsAgentId
              ? t("ElevenLabs Agent Created")
              : t("Create ElevenLabs Agent")}
          </Button>
        )}

        {currentFlow && (
          <FlowsDeleteDialog
            agentFlow={currentFlow}
            onDeleteFlow={(flow) => {
              setCurrentFlow(undefined);
              setInputs([]);
              setRootFlow(undefined);

              const filteredFlows = flows.filter((f) => f.code !== flow.code);
              sessionStorage.removeItem("currentFlow");
              setValue("flows", filteredFlows);

              if (filteredFlows.length > 0) {
                if (defaultFlow === flow.code)
                  setValue(
                    "defaultFlow",
                    filteredFlows[filteredFlows.length - 1].code
                  );

                setRootFlow(filteredFlows[filteredFlows.length - 1].flow);
                setCurrentFlow(filteredFlows[filteredFlows.length - 1]);
                setInputs(filteredFlows[filteredFlows.length - 1].inputs);
              }
            }}
          />
        )}
      </div>

      {dataLoaderVisible && <DataLoader />}

      {rootFlow && (
        <div>
          <Accordion
            type="multiple"
            className="w-full"
            value={currentTabs}
            onValueChange={(value) => setCurrentTabs(value)}
          >
            <AccordionItem
              value="inputs"
              className="rounded-lg border pl-2 pr-2 mb-2"
            >
              <AccordionTrigger>
                <div className="flex">
                  <VariableIcon className="mr-2" /> {t("Inputs")}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <FlowInputVariablesEditor
                  variables={inputs ?? []}
                  onChange={onVariablesChanged}
                />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="agents"
              className="rounded-lg border pl-2 pr-2 mb-2"
            >
              <AccordionTrigger>
                <div className="flex">
                  <WorkflowIcon className="mr-2" />
                  {t("Available sub-agents")}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <FlowAgentsEditor agents={agents} onChange={onAgentsChanged} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="debugger"
              className="rounded-lg border pl-2 pr-2 mb-2"
            >
              <AccordionTrigger>
                <div className="flex">
                  <PlayIcon className="mr-2" />
                  {t("Debugger")}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ExecProvider>
                  <FlowsExecForm
                    initializeExecContext={true}
                    agent={agent}
                    agentFlow={currentFlow}
                    agents={agents}
                    inputs={inputs}
                    flows={flows}
                    displayMode={ExecFormDisplayMode.Admin}
                    databaseIdHash={dbContext?.databaseIdHash}
                  >
                    {isDirty ? (
                      <Button
                        onClick={handleSubmit(onSubmit)}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {t("Save")}
                      </Button>
                    ) : null}
                  </FlowsExecForm>
                </ExecProvider>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <FlowBuilder
            flow={rootFlow}
            inputs={inputs}
            onFlowChange={onFlowChanged}
            onNoAgentsError={() => {
              setCurrentTabs(["agents"]);
            }}
            agentNames={agents.map((a) => a.name)}
          />
          {errors.flows && (
            <p className="text-red-500 text-sm">
              {errors.flows.message as string}
            </p>
          )}
        </div>
      )}

      <Button
        onClick={handleSubmit(onSubmit)}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {t("Save")}
      </Button>

      <Dialog
        open={createElevenLabsDialogOpen}
        onOpenChange={setCreateElevenLabsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <h3 className="font-bold text-m">{t("Create ElevenLabs Agent")}</h3>
          </DialogHeader>
          <div className="space-y-4 p-4">
            {elevenLabsError && (
              <div className="text-red-500 text-sm p-4 border border-red-500 bg-red-200">
                {elevenLabsError}
              </div>
            )}
            <p>
              {t(
                "This will create an ElevenLabs conversational AI agent for the current flow:"
              )}{" "}
              <strong>{currentFlow?.name}</strong>
            </p>
            <p>
              {t(
                "The agent will be configured based on the flow description, sequence, and available sub-agents."
              )}
            </p>
            <p>
              {t(
                "Make sure you have configured your ElevenLabs API key in the environment variables."
              )}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={createElevenLabsAgent} disabled={isCreatingAgent}>
              {isCreatingAgent ? t("Creating...") : t("Create Agent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
