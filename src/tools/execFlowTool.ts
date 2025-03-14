// createExecFlowTool.ts

import { z } from "zod";
import { tool, ToolExecutionOptions } from "ai";

import { openai } from "@ai-sdk/openai";
import { execute } from "flows-ai";

import { Agent, AgentFlow } from "@/data/client/models";
import { createDynamicZodSchemaForInputs, injectVariables, extractVariableNames, replaceVariablesInString, applyInputTransformation } from "@/flows/inputs";
import { convertToFlowDefinition, FlowChunkEvent, messagesSupportingAgent } from "@/flows/models";
import { processFiles, getMimeType, replaceBase64Content } from "@/lib/file-extractor";
import { setRecursiveNames } from "@/lib/json-path";
import { StorageService } from "@/lib/storage-service";
import { validateTokenQuotas } from "@/lib/quotas";
import { getErrorMessage, safeJsonParse } from "@/lib/utils";

import ServerSessionRepository from "@/data/server/server-session-repository";
import ServerAgentRepository from "@/data/server/server-agent-repository";
import ServerResultRepository from "@/data/server/server-result-repository";
import ServerStatRepository from "@/data/server/server-stat-repository";
import ServerAttachmentRepository from "@/data/server/server-attachment-repository";

import { createTraceTool } from "@/tools/traceTool";
import { createUpdateResultTool } from "@/tools/updateResultTool";
import { ToolDescriptor, toolRegistry } from "@/tools/registry";
import { prepareAgentTools } from "@/app/api/chat/route";

import { Session, ToolConfiguration } from "@/data/client/models";
import { SessionDTO, StatDTO } from "@/data/dto";
import { CoreUserMessage, ImagePart, TextPart } from "ai";
import { nanoid } from "nanoid";

/**
 * Context with all data needed to execute the flow, including optional streaming controller.
 */
export interface ExecFlowToolContext {
  masterAgent: Agent;
  databaseIdHash: string;
  saasContext: any; // your SaaS context
  sessionId: string;
  agentId: string;

  currentDateTimeIso: string;
  currentLocalDateTime: string;
  currentTimezone: string;

  /**
   * If streaming is required, pass a ReadableStreamDefaultController here.
   * Otherwise, it can be null.
   */
  streamingController: ReadableStreamDefaultController<any> | null;
}

/**
 * Creates a tool that executes a given AgentFlow with provided input data.
 * The dynamic zod schema for `input` is generated from `masterAgent.inputs`.
 */
export function createExecFlowTool(context: ExecFlowToolContext): ToolDescriptor {
  const {
    masterAgent,
    databaseIdHash,
    saasContext,
    sessionId,
    agentId,
    currentDateTimeIso,
    currentLocalDateTime,
    currentTimezone
  } = context;

  let { streamingController } = context;

  // Build a dynamic schema for the `input` field, based on the agent definition.
  const dynamicInputSchema = createDynamicZodSchemaForInputs({
    availableInputs: masterAgent.inputs ?? [],
  });

  // Main schema for execRequest
  const execRequestSchema = z.object({
    flow: z.string(),
    outputMode: z.enum(["stream", "buffer"]).default("stream").optional(),
    execMode: z.enum(["sync", "async"]).default("sync").optional(),
    input: dynamicInputSchema,
  });

  /**
   * Main method that orchestrates the logic (similar to the old `execFlow`).
   * It has access to the entire context from closures, including streamingController.
   */
  async function doExecute(execRequest: z.infer<typeof execRequestSchema>): Promise<any> {
    // Validate token quotas if running in SaaS mode
    if (saasContext?.isSaasMode) {
      if (!saasContext.hasAccess) {
        throw new Error("Unauthorized - no SaaS access");
      } else {
        if (saasContext.saasContex) {
          const resp = await validateTokenQuotas(saasContext.saasContex);
          if (resp?.status !== 200) {
            throw new Error("SaaS token quotas exceeded or invalid");
          }
        } else {
          throw new Error("Unauthorized - SaaS context missing");
        }
      }
    }

    // Find the specified flow
    const foundFlow = (masterAgent.flows ?? []).find((f) => f.code === execRequest.flow);
    if (!foundFlow) {
      throw new Error(`Flow '${execRequest.flow}' does not exist in this agent definition.`);
    }

    // Handle execMode: async => run in background, return link to result
    if (execRequest.execMode === "async") {
      // Force outputMode = buffer, and run in the background
      setTimeout(() => {
        runFlow(foundFlow, execRequest).catch((err) => {
          console.error("Async flow error:", err);
        });
      }, 0);

      return {
        sessionId,
        resultUrl: `/api/agent/${agentId}/result/${sessionId}`,
      };
    }

    return await runFlow(foundFlow, execRequest);
  }

  /**
   * Worker function that actually runs the flow, creates tools, modifies prompts, etc.
   */
  async function runFlow(flow: AgentFlow, execRequest: z.infer<typeof execRequestSchema>) {
    const sessionRepo = new ServerSessionRepository(
      databaseIdHash,
      saasContext?.isSaasMode ? saasContext.saasContex?.storageKey : null
    );

    // Helper for streaming text chunks, if streamingController is not null.
    const encoder = new TextEncoder();
    const stackTrace: FlowChunkEvent[] = [];

    function outputAndTrace(chunk: FlowChunkEvent) {
      // Attach a timestamp
      chunk.timestamp = new Date();
      // Save locally
      stackTrace.push(chunk);

      // If we have a streaming controller and the outputMode is "stream", enqueue JSON chunk
      if (streamingController) {
        let textChunk:string = replaceBase64Content(JSON.stringify(chunk));
        textChunk = textChunk.replaceAll("\n","").replaceAll("\r", "") + "\n"

        streamingController.enqueue(encoder.encode(textChunk));
      }
    }

    // Prepare the updateResultTool and traceTool
    const updateResultToolInstance = createUpdateResultTool(
      databaseIdHash,
      saasContext?.isSaasMode ? saasContext.saasContex?.storageKey : null
    ).tool;

    const traceToolInstance = createTraceTool(
      databaseIdHash,
      (chunk: FlowChunkEvent) => {
        outputAndTrace(chunk);
      },
      saasContext?.isSaasMode ? saasContext.saasContex?.storageKey : null
    ).tool;

    // Gather variables and files from the input
    const variablesToInject: Record<string, string> = {};
    let filesToUpload: Record<string, string | string[]> = {};

    for (const inputDef of masterAgent.inputs ?? []) {
      if (inputDef.type !== "fileBase64") {
        variablesToInject[inputDef.name] = (execRequest.input as any)[inputDef.name];
      } else {
        filesToUpload[inputDef.name] = (execRequest.input as any)[inputDef.name];
      }
    }

    // If we have files to upload, show a "stepFinish" chunk
    if (Object.keys(filesToUpload).length > 0) {
      outputAndTrace({
        type: "stepFinish",
        name: "Extracting text from files ...",
      });
    }

    // Convert PDF to images or other processing
    filesToUpload = processFiles({
      inputObject: filesToUpload,
      pdfExtractText: false,
    });

    const attRepo = new ServerAttachmentRepository(
      databaseIdHash,
      saasContext?.isSaasMode ? saasContext.saasContex?.storageKey : null
    );

    // Convert the flow definition and inject variables
    const compiledFlow = injectVariables(convertToFlowDefinition(flow.flow), variablesToInject);
    setRecursiveNames(compiledFlow);

    // For each node, if input is a string, let's create a CoreUserMessage and inject additional context
    await applyInputTransformation(compiledFlow, async (node) => {
      if (node.input && typeof node.input === "string") {
        const usedVars = extractVariableNames(node.input);

        const newInput: CoreUserMessage = {
          role: "user",
          content: [
            {
              type: "text",
              text: replaceVariablesInString(node.input, variablesToInject),
            },
          ],
        };

        // Add raw user input data (if it makes sense in this tool)
        (newInput.content as Array<TextPart>).push({
          type: "text",
          text: "User input: `" + JSON.stringify(execRequest.input) + "`",
        });

        // Add system context
        (newInput.content as Array<TextPart>).push({
          type: "text",
          text: "Context: `" + JSON.stringify({
            sessionId,
            currentDateTimeIso,
            currentLocalDateTime,
            currentTimezone,
            agentId,
            defaultLocale: masterAgent.locale,
          }) + "`",
        });

        // Check used variables for files/attachments
        for (const v of (usedVars.length > 0 ? usedVars : (masterAgent.inputs ?? []).map(i => i.name))) {
          // If it's in filesToUpload
          if (filesToUpload[v]) {
            const fileMapper = (key: string, fileBase64: string) => {
              if (getMimeType(fileBase64)?.startsWith("image")) {
                (newInput.content as Array<ImagePart>).push({
                  type: "image",
                  image: fileBase64,
                  mimeType: getMimeType(fileBase64) || "application/octet-stream",
                });
              } else {
                (newInput.content as Array<TextPart>).push({
                  type: "text",
                  text: `This is the content of @${key} file:${fileBase64}`,
                });
              }
            };

            if (Array.isArray(filesToUpload[v])) {
              filesToUpload[v].forEach((fc) => fileMapper(v, fc as string));
            } else {
              fileMapper(v, filesToUpload[v] as string);
            }
          } else {
            // Otherwise, maybe it's an attachment in DB (by symbolicNameIdentifier)
            if (!variablesToInject[v]) {
              const attachments = await attRepo.queryAll({
                query: v,
                limit: 1,
                offset: 0,
                orderBy: "createdAt",
              });
              if (attachments && attachments.rows.length > 0) {
                const a1 = attachments.rows[0];
                if (a1.symbolicNameIdentifier === v) {
                  (newInput.content as Array<TextPart>).push({
                    type: "text",
                    text: `This is the content of @${v} file:${a1.content}`,
                  });
                }
              }
            }
          }
        }

        return JSON.stringify(newInput);
      }

      return node.input;
    });

    // Compile agents
    const compiledAgents: Record<string, any> = {};

    for (const subAgent of masterAgent.agents ?? []) {
      const toolReg: Record<string, ToolConfiguration> = {};

      // Prepare the subAgent's tools
      for (const ts of subAgent.tools) {
        toolReg["tool-" + nanoid()] = {
          description: "",
          tool: ts.name,
          options: ts.options,
        };
      }

      // Merge the dynamic set of tools
      const customTools = await prepareAgentTools({
          tools: toolReg,
          databaseIdHash,
          storageKey: saasContext?.isSaasMode ? saasContext.saasContex?.storageKey : null,
          agentId,
          sessionId,
          agent: masterAgent,
          saasContext,
          streamingController
        }
      );

      const flowNodeId = nanoid();

      // Build the flows-ai agent with "messagesSupportingAgent"
      compiledAgents[subAgent.name] = messagesSupportingAgent({

        streaming: messagesSupportingAgent !== null,
        onDataChunk: (chunk) => {
          outputAndTrace(chunk);
        },
        

        onStepFinish: async (result) => {
        if (result.finishReason === 'tool-calls') {
            // Output chunk
            outputAndTrace({
              type: "toolCalls",
              flowNodeId,
              flowAgentId: flowNodeId,
              name: `${subAgent.name} (${subAgent.model})`,
              toolResults: result.toolResults
            });
          }

          if (result.finishReason === 'error') {
            outputAndTrace({
              type: "error",
              flowNodeId,
              message: result.text,
              toolResults: result.toolResults
            });            
          }


          // Update session usage stats
          const { usage } = result;
          let existingSession = await sessionRepo.findOne({ id: sessionId });
          const updatedCompletion = (existingSession?.completionTokens ?? 0) + usage.completionTokens;
          const updatedPrompt = (existingSession?.promptTokens ?? 0) + usage.promptTokens;

          const updatedSession = await sessionRepo.upsert(
            { id: sessionId },
            {
              id: sessionId,
              agentId,
              completionTokens: updatedCompletion,
              promptTokens: updatedPrompt,
              createdAt: existingSession ? existingSession.createdAt : new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as SessionDTO
          );

          // Stats
          const statsRepo = new ServerStatRepository(databaseIdHash, "stats");
          const usageData: StatDTO = {
            eventName: "chat",
            completionTokens: usage.completionTokens,
            promptTokens: usage.promptTokens,
            createdAt: new Date().toISOString(),
          };
          await statsRepo.aggregate(usageData);

          // SaaS stats
          if (saasContext?.apiClient) {
            try {
              saasContext.apiClient.saveStats(databaseIdHash, {
                ...usageData,
                databaseIdHash,
              });
            } catch (e) {
              console.error("SaaS stats error:", e);
            }
          }
        },
        model: openai(subAgent.model, {}),
        name: subAgent.name,
        id: flowNodeId,
        system: subAgent.system,
        messages: [],
        tools: {
          ...customTools,
          // TODO: add execFlow tool
          // you could optionally expose traceToolInstance and updateResultToolInstance if needed
        },
      });
    }

    // Execute the flow
    const flowResult = await execute(compiledFlow, {
      agents: compiledAgents,
      onFlowStart: (flowContext) => {
        outputAndTrace({
          type: "flowStart",
          flowNodeId: nanoid(),
          name: flowContext.name, // name can contain some path parent/child info
          input: flowContext.input,
          timestamp: new Date(),          
        });
      },
      onFlowFinish: (flowContext, result) => {
        // Could add a "flowFinish" chunk here if needed
      },
    });

    // Final chunk with the result
    outputAndTrace({
      type: "finalResult",
      flowNodeId: nanoid(),
      name: flow.name,
      result: flowResult,
    });

    // Save the result if not already existing
    const resultRepo = new ServerResultRepository(
      databaseIdHash,
      saasContext?.isSaasMode ? saasContext.saasContex?.storageKey : null
    );
    const existingResult = await resultRepo.findOne({ sessionId });
    if (!existingResult) {
      if (updateResultToolInstance.execute) {
        await updateResultToolInstance.execute(
          {
            sessionId,
            format: safeJsonParse(flowResult, null) !== null ? "json" : "markdown",
            result: flowResult,
            language: "en",
          },
          {
            messages: [],
            toolCallId: nanoid(),
          }
        );
      }
    }

    return flowResult;
  }

  const injectStreamingController = (controller: ReadableStreamDefaultController<any>) => {
    streamingController = controller;
  };

  // Create the AI tool object
  const execFlowTool = tool({
    description: "Executes a specified flow (AgentFlow) with provided input data.",
    parameters: execRequestSchema,

    // The only parameter is what the user/client passes (flow, outputMode, execMode, input).
    async execute(execRequest): Promise<any> {
        execRequestSchema.parse(execRequest);
//      try {
      return await doExecute(execRequest);
      // } catch (err) {
      //   return { error: getErrorMessage(err) };
      // }
    },
  });

  return { tool: execFlowTool, displayName: "Execute flow", injectStreamingController };
}
