// flows-end-user-ui.tsx

"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  BrainIcon,
  FileCogIcon,
  FileWarningIcon,
  HourglassIcon,
  TextCursorInputIcon,
  TimerIcon,
} from "lucide-react";

import { ChatMessageMarkdown } from "../chat-message-markdown";
import { safeJsonParse } from "@/lib/utils";
import { ChatMessageToolResponse } from "../chat-message-tool-response";
import {
  FlowChunkEvent,
  FlowChunkType,
  FlowUITreeNode,
} from "@/flows/models";
import { uiComponentsRegistry } from "./flows-components-registry";

interface EndUserUIProps {
  /** Which chunk types should be displayed in the left column? (Optional) */
  displayChunkTypes?: FlowChunkType[];

  /** Called by any UI component in the right column that needs to send user actions. */
  onSendUserAction?: (data: any) => void;
}

export type EndUserUIHandle = {
  clear: () => void;
  handleChunk: (chunk: FlowChunkEvent) => void;
};

export const FlowsEndUserUI = forwardRef<EndUserUIHandle, EndUserUIProps>(
  function FlowsEndUserUI(props, ref) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);

    const [uiTree, setUiTree] = useState<FlowUITreeNode[]>([]);

    /** Clears the entire UI. */
    function clear() {
      setUiTree([]);
    }

    /**
     * Handles incoming chunks and updates the uiTree accordingly.
     */
    function handleChunk(chunk: FlowChunkEvent) {
      setUiTree((prev) => {
        let newTree = [...prev];

        // If we need to delete a node
        if (chunk.deleteFlowNodeId) {
          newTree = newTree.filter(
            (node) => node.flowNodeId !== chunk.deleteFlowNodeId
          );
        }
        // If we need to replace an existing node
        if (chunk.replaceFlowNodeId && chunk.flowNodeId) {
          newTree = newTree.filter(
            (node) => node.flowNodeId !== chunk.replaceFlowNodeId
          );
        }

        // If chunk.flowNodeId is set, we either create or update a node
        if (chunk.flowNodeId) {
          const existingIndex = newTree.findIndex(
            (n) => n.flowNodeId === chunk.flowNodeId
          );
          if (existingIndex >= 0) {
            // Update existing node
            const node = { ...newTree[existingIndex] };
            node.name = chunk.name ?? node.name;
            node.timestamp = chunk.timestamp ?? node.timestamp;
            node.duration = chunk.duration ?? node.duration;

            // Merge chunk details depending on chunk type
            switch (chunk.type) {
              case FlowChunkType.TextStream:
                if (node.type === FlowChunkType.Generation) {
                  node.accumulatedText =
                    (node.accumulatedText || "") + (chunk.result || "");
                }
                break;
              case FlowChunkType.GenerationEnd:
                if (node.type === FlowChunkType.Generation) {
                  node.duration = chunk.duration;
                }
                break;
              case FlowChunkType.Error:
                node.message = chunk.message;
                break;
              case FlowChunkType.ToolCalls:
                if (chunk.toolResults && chunk.toolResults.length > 0) {
                  node.toolResults = [
                    ...(node.toolResults || []),
                    ...chunk.toolResults,
                  ];
                }
                break;
              default:
                // finalResult, message, or other chunk
                if (chunk.message) node.message = chunk.message;
                if (chunk.result) node.result = chunk.result;
                if (chunk.toolResults) node.toolResults = chunk.toolResults;
                if (chunk.messages) node.messages = chunk.messages;
            }

            if (chunk.componentProps) {
              node.componentProps = {
                ...node.componentProps,
                ...chunk.componentProps,
              };
            }

            newTree[existingIndex] = node;
          } else {
            // Create a new node
            const newNode: FlowUITreeNode = {
              flowNodeId: chunk.flowNodeId,
              type: chunk.type,
              timestamp: chunk.timestamp,
              name: chunk.name,
              duration: chunk.duration,
              messages: chunk.messages,
              message: chunk.message,
              input: chunk.input,
              result: chunk.result,
              toolResults: chunk.toolResults,
              component: chunk.component,
              componentProps: chunk.componentProps,
            };

            // If we are receiving a generation or text-stream type
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

    // Auto-scroll whenever uiTree changes
    useEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, [uiTree]);

    // Expose handleChunk & clear to the parent
    useImperativeHandle(ref, () => ({
      handleChunk,
      clear,
    }));

    /** Render a single node for the left column. (Non-UIComponent types) */
    function renderNode(node: FlowUITreeNode, index: number) {
      // If user only wants certain chunk types displayed, skip if not included
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

      return (
        <div key={node.flowNodeId} className="mb-2 p-2 border-b text-xs">
          <div className="flex justify-between items-center">
            <div className="text-xs mb-2 font-bold flex">
              {icon} {t("Step")} {index + 1}. {node.name || node.type}
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              {node.duration && (
                <div className="flex ml-2 text-gray-500">
                  <TimerIcon className="w-4 h-4 mr-2 ml-2" />
                  ({node.duration} s)
                </div>
              )}
              {/** Show hourglass if it's the last node and not finished */}
              {index === uiTree.length - 1 &&
                node.type !== FlowChunkType.Error &&
                node.type !== FlowChunkType.FinalResult && (
                  <div className="p-2 items-center justify-center">
                    <HourglassIcon className="w-4 h-4" />
                  </div>
                )}
            </div>
          </div>

          {/* If it's a generation node, show the streaming text (accumulatedText) */}
          {node.type === FlowChunkType.Generation && (
            <>
              {node.accumulatedText ? (
                <ChatMessageMarkdown>{node.accumulatedText}</ChatMessageMarkdown>
              ) : (
                node.duration ? (
                  <div className="flex items-center justify-center text-red-500">
                    <FileWarningIcon className="w-4 h-4 mr-2" />
                    {t("Generation error")}...
                  </div>
                ) : (
                  <div className="flex text-center items-center justify-center">
                    <BrainIcon className="w-4 h-4 mr-2" />
                    {t("AI Thinking")}...
                  </div>
                )
              )}
            </>
          )}

          {/* Show any tool results if present */}
          {node.toolResults &&
            node.toolResults.map((c, i) => {
              const parsed = typeof c.result ==='string' ? safeJsonParse(c.result || "", null) : c.result;
              if (parsed === null) {
                return (
                  <ChatMessageMarkdown key={i}>{c.result}</ChatMessageMarkdown>
                );
              }
              return (
                <ChatMessageToolResponse key={i} args={c.args} result={parsed} />
              );
            })}

          {/* Show message if there is one (errors or normal messages) */}
          {node.message && node.type !== FlowChunkType.Generation && (
            <ChatMessageMarkdown>{node.message}</ChatMessageMarkdown>
          )}

          {/* Show final result if present */}
          {node.result && node.type !== FlowChunkType.Generation && (
            <ChatMessageMarkdown>
              {Array.isArray(node.result) ? node.result.join("\n") : node.result}
            </ChatMessageMarkdown>
          )}
        </div>
      );
    }

    // Separate all chunks into UI components vs. normal trace
    const uiComponentNodes = uiTree.filter(
      (node) => node.type === FlowChunkType.UIComponent
    );
    const normalNodes = uiTree.filter(
      (node) => node.type !== FlowChunkType.UIComponent
    );

    // If there's nothing at all, render empty
    if (uiTree.length === 0) {
      return null;
    }

    return (
      <div className="flex w-full">
        {/* Left column: normal chunk display */}
        <div
          ref={containerRef}
          className={`border rounded p-2 ${
            uiComponentNodes.length > 0 ? "w-2/3" : "w-full"
          } text-sm mt-2`}
        >
          {normalNodes.map((node, idx) => renderNode(node, idx))}
        </div>

        {/* Right column: UI components (if any FlowChunkType.UIComponent appear) */}
        {uiComponentNodes.length > 0 && (
          <div className="border-l p-2 w-1/3 max-h-96 overflow-y-auto text-sm mt-2">
            {uiComponentNodes.map((node, i) => {
              // If there's a known component in the registry, render it
              if (node.component && uiComponentsRegistry[node.component]) {
                const Component = uiComponentsRegistry[node.component].component;
                return (
                  <div key={node.flowNodeId} className="mb-4">
                    <Component
                      {...node.componentProps}
                      onSendUserAction={props.onSendUserAction}
                    />
                  </div>
                );
              }
              // Otherwise, if the chunk is UIComponent but not recognized...
              return (
                <div
                  key={node.flowNodeId}
                  className="mb-2 p-2 border rounded bg-gray-50 text-xs"
                >
                  {t("Unknown UI component type")}:
                  <pre className="mt-1">
                    {JSON.stringify(node.component, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
  }
);
