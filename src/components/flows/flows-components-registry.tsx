// flow-components-registry.ts

import React from "react";
import { ChatMessageMarkdown } from "../chat-message-markdown";
import { z } from "zod";

/**
 * Example components
 */
function UserTextInput(props: {
  label: string;
  defaultValue: string;
  fieldName: string;
  onSendUserAction?: (data: any) => void;
}) {
  const [value, setValue] = React.useState(props.defaultValue);

  const handleClick = () => {
    // We call the callback passed from the parent
    // e.g. we send an event that in exec-form triggers the stream to be called again
    if (props.onSendUserAction) {
      props.onSendUserAction({ [props.fieldName]: value });
    }
  };

  return (
    <div className="p-2 border rounded mt-2">
      <label className="text-sm block mb-1">{props.label}</label>
      <input
        className="border p-1 text-sm w-full"
        value={value}
        name={props.fieldName}
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

function TextDisplay(props: { text: string }) {
  return (
    <div className="p-2 border rounded mt-2">
      <ChatMessageMarkdown>{props.text}</ChatMessageMarkdown>
    </div>
  );
}

export const uiComponentsRegistry: Record<
  string,
  { displayName: string, component: React.ComponentType<any>, props: z.ZodType<any, any> }
> = {
  textInput: {
    displayName: 'Text Input',
    component: UserTextInput,
    props: z.object({
      label: z.string(),
      fieldName: z.string(),
      defaultValue: z.string()
    })
  },
  textDisplay: {
    displayName: 'Text Display',
    component: TextDisplay,
    props: z.object({
      text: z.string()
    })
  }
};


