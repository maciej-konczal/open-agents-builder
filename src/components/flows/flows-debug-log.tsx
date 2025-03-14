// flows-debug-log.tsx

"use client"

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ChatMessageMarkdown } from "../chat-message-markdown";
import {
  FlowChunkEvent,
  FlowChunkType,
  FlowUITreeNode,
} from "@/flows/models";
import { safeJsonParse } from "@/lib/utils";
import { BrainIcon, FileCogIcon, FileWarningIcon, HourglassIcon, TextCursorIcon, TextCursorInputIcon, TimerIcon } from "lucide-react";
import { ChatMessageToolResponse } from "../chat-message-tool-response";
import { useTranslation } from "react-i18next";
import { uiComponentsRegistry } from "./flows-components-registry";
import { DebugChatMessages } from "../debug-chat-messages";
import { DisplayToolResultsMode } from "../chat-messages";

interface DebugLogProps {
  displayChunkTypes?: FlowChunkType[];
  onSendUserAction?: (data: any) => void;
}

export type DebugLogHandle = {
  handleChunk: (chunk: FlowChunkEvent) => void;
  clear: () => void;
};

export const FlowsDebugLog = forwardRef<DebugLogHandle, DebugLogProps>(
  function FlowsDebugLog(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    const [uiTree, setUiTree] = useState<FlowUITreeNode[]>([]);
    const [openChunks, setOpenChunks] = useState<string[]>([]);

    function clear() {
      setUiTree([]);
    }

    function handleChunk(chunk: FlowChunkEvent) {
      setUiTree((prevTree) => {
        let newTree = [...prevTree];

        if (chunk.deleteFlowNodeId) {
          newTree = newTree.filter(
            (node) => node.flowNodeId !== chunk.deleteFlowNodeId
          );
        }
        if (chunk.replaceFlowNodeId && chunk.flowNodeId) {
          newTree = newTree.filter(
            (node) => node.flowNodeId !== chunk.replaceFlowNodeId
          );
        }

        if (chunk.flowNodeId) {
          const idx = newTree.findIndex((n) => n.flowNodeId === chunk.flowNodeId);
          if (idx >= 0) {
            const existing = { ...newTree[idx] };
            existing.timestamp = chunk.timestamp ?? existing.timestamp;
            existing.name = chunk.name ?? existing.name;
            existing.duration = chunk.duration ?? existing.duration;

            switch (chunk.type) {
              case FlowChunkType.TextStream:
                if (existing.type === FlowChunkType.Generation) {
                  existing.accumulatedText =
                    (existing.accumulatedText || "") + (chunk.result || "");
                }
                break;
              case FlowChunkType.GenerationEnd:
                if (existing.type === FlowChunkType.Generation) {
                  existing.duration = chunk.duration;
                }
                break;
              default:
                if (chunk.message) existing.message = chunk.message;
                if (chunk.result) existing.result = chunk.result;
                if (chunk.toolResults) existing.toolResults = chunk.toolResults;
                if (chunk.messages) existing.messages = chunk.messages;
            }

            if (chunk.componentProps) {
              existing.componentProps = {
                ...existing.componentProps,
                ...chunk.componentProps,
              };
            }

            newTree[idx] = existing;
          } else {
            // create
            const newNode: FlowUITreeNode = {
              flowNodeId: chunk.flowNodeId,
              type: chunk.type,
              name: chunk.name,
              timestamp: chunk.timestamp,
              duration: chunk.duration,
              message: chunk.message,
              result: chunk.result,
              toolResults: chunk.toolResults,
              messages: chunk.messages,
              input: chunk.input,
              component: chunk.component,
              componentProps: chunk.componentProps,
            };

            if (chunk.type === FlowChunkType.Generation) {
              newNode.accumulatedText = "";
            } else if (chunk.type === FlowChunkType.TextStream) {
              newNode.accumulatedText = chunk.result || "";
              newNode.type = FlowChunkType.Generation;
            }

            newTree.push(newNode);
          }
        }

        return newTree;
      });
    }

    useEffect(() => {
      if (containerRef.current) {
        //containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      if (uiTree.length > 0) {
        setOpenChunks((prev) => [...prev, `chunk-${uiTree.length - 1}`]);
      }
    }, [uiTree]);

    useImperativeHandle(ref, () => ({
      handleChunk,
      clear
    }));

    function renderNode(node: FlowUITreeNode, index: number) {
      if (
        props.displayChunkTypes &&
        !props.displayChunkTypes.includes(node.type)
      ) {
        return null;
      }

      let icon = <BrainIcon className="w-4 h-4 mr-2 ml-2" />;
      if (node.type === FlowChunkType.ToolCalls) {
        icon = <FileCogIcon className="w-4 h-4 mr-2 ml-2" />;
      }
      if (node.type === FlowChunkType.Generation) {
        icon = <TextCursorInputIcon className="w-4 h-4 mr-2 ml-2" />;
      }
      if (node.type === FlowChunkType.Error) {
        icon = <FileWarningIcon className="w-4 h-4 mr-2 ml-2" />;
      }


      const date = node.timestamp ? node.timestamp.toString() : t("No date");

      if (node.component && uiComponentsRegistry[node.component]) {
        const Component = uiComponentsRegistry[node.component];
        return (
          <AccordionItem
            value={`chunk-${index}`}
            key={`chunk-${index}`}
            className="mb-2"
          >
            <AccordionTrigger>
              <div className="grid grid-cols-2 w-full">
                <div className="flex items-center font-normal">
                  {icon} {index + 1}.
                  <span className="font-normal dark:text-white p-1 bg-gray-500 rounded-md mx-2">
                    {node.type}
                  </span>
                  <span className="font-bold">{node.name}</span>
                </div>
                <div className="ml-2 text-xs text-gray-500 flex items-center justify-end">
                  {date}
                  {node.duration && (
                    <div className="flex ml-2 text-gray-500">
                      <TimerIcon className="w-4 h-4 mr-2 ml-2" />(
                      {node.duration} s)
                    </div>
                  )}
                  {index === uiTree.length - 1 &&
                    node.type !== FlowChunkType.Error &&
                    node.type !== FlowChunkType.FinalResult && (
                      <div className="p-2 items-center justify-center">
                        <HourglassIcon className="w-4 h-4" />
                      </div>
                    )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Component
                {...node.componentProps}
                onSendUserAction={props.onSendUserAction}
              />
            </AccordionContent>
          </AccordionItem>
        );
      }

      return (
        <AccordionItem
          value={`chunk-${index}`}
          key={`chunk-${index}`}
          className="mb-2"
        >
          <AccordionTrigger>
            <div className="grid grid-cols-2 w-full">
              <div className="flex items-center font-normal">
                {icon} {index + 1}.
                <span className="font-normal dark:text-white p-1 bg-gray-500 rounded-md mx-2">
                  {node.type}
                </span>
                <span className="font-bold">{node.name}</span>
              </div>
              <div className="ml-2 text-xs text-gray-500 flex items-center justify-end">
                {date}
                {node.duration && (
                  <div className="flex ml-2 text-gray-500">
                    <TimerIcon className="w-4 h-4 mr-2 ml-2" />({node.duration} s)
                  </div>
                )}
                {index === uiTree.length - 1 &&
                  node.type !== FlowChunkType.Error &&
                  node.type !== FlowChunkType.FinalResult && (
                    <div className="p-2 items-center justify-center">
                      <HourglassIcon className="w-4 h-4" />
                    </div>
                  )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="mt-2 space-y-2">
              {node.messages && node.messages.length > 0 && (
                <DebugChatMessages
                  messages={node.messages}
                  displayToolResultsMode={DisplayToolResultsMode.AsTextMessage}
                  displayTimestamps={false}
                />
              )}

              {node.message && node.type === FlowChunkType.Error && (
                <div className="text-red-500">
                  <ChatMessageMarkdown>{node.message}</ChatMessageMarkdown>
                </div>
              )}
              {node.message && node.type !== FlowChunkType.Error && (
                <ChatMessageMarkdown>{node.message}</ChatMessageMarkdown>
              )}

              {node.type === FlowChunkType.Generation && node.accumulatedText && (
                <ChatMessageMarkdown>{node.accumulatedText}</ChatMessageMarkdown>
              )}

              {node.toolResults &&
                node.toolResults.map((c, i) => {
                  const parsed = safeJsonParse(c.result || "", null);
                  if (parsed === null) {
                    return (
                      <ChatMessageMarkdown key={i}>
                        {c.result}
                      </ChatMessageMarkdown>
                    );
                  }
                  return (
                    <ChatMessageToolResponse
                      key={i}
                      args={c.args}
                      result={parsed}
                    />
                  );
                })}

              {node.result && node.type !== FlowChunkType.Generation && (
                <ChatMessageMarkdown>
                  {Array.isArray(node.result)
                    ? node.result.join("\n")
                    : node.result}
                </ChatMessageMarkdown>
              )}

              {node.input && typeof node.input === "string" && (
                <div>
                  <div className="font-semibold">{t("Input")}</div>
                  {safeJsonParse(node.input, null) === null ? (
                    <ChatMessageMarkdown>{node.input}</ChatMessageMarkdown>
                  ) : (
                    <DebugChatMessages
                      messages={[JSON.parse(node.input)]}
                      displayToolResultsMode={DisplayToolResultsMode.AsTextMessage}
                      displayTimestamps={false}
                    />
                  )}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      );
    }

    return (
      <div
        className="border rounded p-2 w-full h-96 overflow-y-auto text-sm"
        ref={containerRef}
      >
        <Accordion
          type="multiple"
          value={openChunks}
          onValueChange={(vals) => setOpenChunks(vals)}
        >
          {uiTree.map((node, idx) => renderNode(node, idx))}
        </Accordion>
      </div>
    );
  }
);
