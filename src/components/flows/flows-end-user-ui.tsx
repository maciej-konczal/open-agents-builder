// flows-end-user-ui.tsx

"use client"

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { BrainIcon, FileCogIcon, FileWarningIcon, HourglassIcon, TextCursorIcon, TextCursorInputIcon, TimerIcon } from "lucide-react";
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
  // Jakie typy chunków chcemy pokazywać w tym UI
  displayChunkTypes?: FlowChunkType[];

  // Callback do akcji wysyłanej przez komponenty (np. MyCustomInput)
  onSendUserAction?: (data: any) => void;
}

/** 
 * Typ interfejsu, który jest „obsługiwany” przez ref z rodzica.
 * Pozwala nam wywołać w rodzicu: endUserUIRef.current?.handleChunk(chunk).
 */
export type EndUserUIHandle = {
  clear: () => void;
  handleChunk: (chunk: FlowChunkEvent) => void;
};

/**
 * Komponent EndUserUI z forwardRef + useImperativeHandle
 */
export const FlowsEndUserUI = forwardRef<EndUserUIHandle, EndUserUIProps>(
  function FlowsEndUserUI(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    const [uiTree, setUiTree] = useState<FlowUITreeNode[]>([]);

    function clear() {
      setUiTree([]);
    }

    /**
     * Funkcja obsługująca przychodzący chunk i aktualizująca stan uiTree.
     */
    function handleChunk(chunk: FlowChunkEvent) {
      setUiTree((prevTree) => {
        let newTree = [...prevTree];

        // Obsługa deleteFlowNodeId
        if (chunk.deleteFlowNodeId) {
          newTree = newTree.filter(
            (node) => node.flowNodeId !== chunk.deleteFlowNodeId
          );
        }

        // Obsługa replaceFlowNodeId
        if (chunk.replaceFlowNodeId && chunk.flowNodeId) {
          // usuwamy stary węzeł
          newTree = newTree.filter(
            (node) => node.flowNodeId !== chunk.replaceFlowNodeId
          );
        }

        // Dodawanie/aktualizowanie węzła
        if (chunk.flowNodeId) {
          const existingIndex = newTree.findIndex(
            (n) => n.flowNodeId === chunk.flowNodeId
          );
          if (existingIndex >= 0) {
            // aktualizujemy istniejący węzeł
            const node = { ...newTree[existingIndex] };
            node.name = chunk.name ?? node.name;
            node.timestamp = chunk.timestamp ?? node.timestamp;
            node.duration = chunk.duration ?? node.duration;

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
                // finalResult, message, itp.
                if (chunk.message) node.message = chunk.message;
                if (chunk.result) node.result = chunk.result;
                if (chunk.toolResults) node.toolResults = chunk.toolResults;
                if (chunk.messages) node.messages = chunk.messages;
            }

            // Uaktualniamy propsy komponentu, jeśli jest
            if (chunk.componentProps) {
              node.componentProps = {
                ...node.componentProps,
                ...chunk.componentProps,
              };
            }

            newTree[existingIndex] = node;
          } else {
            // tworzymy nowy węzeł
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

    // Wywołujemy auto-scroll przy każdej zmianie stanu
    useEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, [uiTree]);

    // Umożliwiamy rodzicowi wywoływanie handleChunk
    useImperativeHandle(ref, () => ({
      handleChunk,
      clear
    }));

    // Render pojedynczego węzła
    function renderNode(node: FlowUITreeNode, index: number) {
      if (
        props.displayChunkTypes &&
        !props.displayChunkTypes.includes(node.type)
      ) {
        return null; // pomijamy węzeł, jeśli nie jest w displayChunkTypes
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


      // Jeśli to jest customowy komponent
      if (node.component && uiComponentsRegistry[node.component]) {
        const Component = uiComponentsRegistry[node.component];
        return (
          <div key={node.flowNodeId} className="mb-2 p-2 border-b text-xs">
            <div className="flex justify-between items-center">
              <div className="text-xs mb-2 font-bold flex">
                {icon} {t("Step")} {index + 1}. {node.name || node.type}
              </div>
              <div className="text-xs text-gray-500 flex items-center">
                {node.duration && (
                  <div className="flex ml-2 text-gray-500">
                    <TimerIcon className="w-4 h-4 mr-2 ml-2" /> ({node.duration} s)
                  </div>
                )}
                {index === uiTree.length - 1 && (
                  <div className="p-2 items-center justify-center">
                    <HourglassIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
            {/* RENDERUJEMY CUSTOMOWY KOMPONENT */}
            <Component
              {...node.componentProps}
              onSendUserAction={props.onSendUserAction}
            />
          </div>
        );
      }

      // Inaczej – standardowa obsługa typu (generation, toolCalls itd.)
      return (
        <div key={node.flowNodeId} className="mb-2 p-2 border-b text-xs">
          <div className="flex justify-between items-center">
            <div className="text-xs mb-2 font-bold flex">
              {icon} {t("Step")} {index + 1}. {node.name || node.type}
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              {node.duration && (
                <div className="flex ml-2 text-gray-500">
                  <TimerIcon className="w-4 h-4 mr-2 ml-2" /> ({node.duration} s)
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

          {/* Accumulated text dla "generation" */}
          {node.type === FlowChunkType.Generation && (
            <>
              {node.accumulatedText ? (
                <ChatMessageMarkdown>{node.accumulatedText}</ChatMessageMarkdown>
              ) : (
                (node.duration ? (<div>
                <div className="flex text-center items-center justify-center text-red-500">
                  <FileWarningIcon className="w-4 h-4 mr-2" />
                  {t("Generation error")}...
                </div>
                </div>) : (
                <div className="flex text-center items-center justify-center">
                  <BrainIcon className="w-4 h-4 mr-2" />
                  {t("AI Thinking")}...
                </div>
                ))
              )}
            </>
          )}

          {/* toolResults */}
          {node.toolResults &&
            node.toolResults.map((c, i) => {
              const parsed = safeJsonParse(c.result || "", null);
              if (parsed === null) {
                return (
                  <ChatMessageMarkdown key={i}>{c.result}</ChatMessageMarkdown>
                );
              }
              return (
                <ChatMessageToolResponse key={i} args={c.args} result={parsed} />
              );
            })}

          {/* Wiadomość (jeśli jest) */}
          {node.message && node.type !== FlowChunkType.Generation && (
            <ChatMessageMarkdown>{node.message}</ChatMessageMarkdown>
          )}

          {/* result */}
          {node.result && node.type !== FlowChunkType.Generation && (
            <ChatMessageMarkdown>
              {Array.isArray(node.result) ? node.result.join("\n") : node.result}
            </ChatMessageMarkdown>
          )}
        </div>
      );
    }

    return (
      uiTree.length > 0 ? (
        <div
          className="border rounded p-2 w-full text-sm mt-2"
          ref={containerRef}
        >
          {uiTree.map((node, idx) => renderNode(node, idx))}
        </div>
      ) : (<></>)
    )
  }
);
