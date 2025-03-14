// flow-components-registry.ts

import React from "react";
import { ChatMessageMarkdown } from "../chat-message-markdown";

/**
 * Przykładowe komponenty
 */
function MyCustomInput(props: {
  label: string;
  defaultValue: string;
  onSendUserAction?: (data: any) => void;
}) {
  const [value, setValue] = React.useState(props.defaultValue);

  const handleClick = () => {
    // Wywołujemy callback przekazany od rodzica
    // np. wysyłamy event, który w exec-form spowoduje ponowne wywołanie strumienia
    if (props.onSendUserAction) {
      props.onSendUserAction({ inputValue: value });
    }
  };

  return (
    <div className="p-2 border rounded mt-2">
      <label className="text-sm block mb-1">{props.label}</label>
      <input
        className="border p-1 text-sm w-full"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className="mt-2 border bg-gray-200 px-2 py-1 text-sm rounded"
        onClick={handleClick}
      >
        Send
      </button>
    </div>
  );
}

function SimpleTextDisplay(props: { text: string }) {
  return (
    <div className="p-2 border rounded mt-2">
      <ChatMessageMarkdown>{props.text}</ChatMessageMarkdown>
    </div>
  );
}

/**
 * Rejestr komponentów do dynamicznego renderowania.
 */
export const uiComponentsRegistry: Record<
  string,
  React.ComponentType<any>
> = {
  myCustomInput: MyCustomInput,
  simpleTextDisplay: SimpleTextDisplay,
  // ... tu dodawaj kolejne typy komponentów
};
