import * as React from "react";
import { useFormContext, useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentTypesRegistry } from "@/prompts/agent-types-registry";
import Markdown from "react-markdown";
import { InfoIcon } from "lucide-react";

export function AgentTypeSelect() {
  const { t, i18n } = useTranslation();

  // Access form methods from context (requires <FormProvider> in the parent).
  const { control } = useFormContext();
  const [agentDescription, setAgentDescription] = React.useState("");

  const agentDescriptions: Record<string, string> = {
    "survey-agent": t("Survey agents are used to collect the information or opionions from the users. Based on the previous answers they can **dynamically adjust** next questions. These agents save the answers for further processing in the desire format. Can replace tools like **Forms, Polls, Intake forms** etc."),
    "smart-assistant": t("Smart assistants are **general purpose agents**. They can use tools for example checking Your calendar or booking new events. They can also be used for surveys (mixed with some other tasks) but needs to be finetuned for doing so on the prompt level."),

  }

  // Tie the `Select` to the "locale" field using React Hook Form's useController
  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({
    name: "agentType", 
    control,
    rules: { required: t("This field is required") },
    // Optionally set a default value here or in the parent useForm({ defaultValues: { locale: ... } }).
    defaultValue: "",
  });

  return (
    <div>
      <Select value={value} onValueChange={(onChange)} onBlur={onBlur} ref={ref}>
        <SelectTrigger
          id="locale"
          className="mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <SelectValue placeholder={t("Select agent type")} />
        </SelectTrigger>

        <SelectContent>
          {agentTypesRegistry.filter(at => at.locale === i18n.language).map((at) => (
            <SelectItem key={at.template} value={at.template}>{at.displayName}</SelectItem>
          ))}          
        </SelectContent>
      </Select>
      <div className="text-xs p-2 flex">
        <div><InfoIcon className="w-4 h-4 mr-2" /></div>
        <Markdown>{agentDescriptions[value]}</Markdown>
      </div>

      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
    </div>
  );
}
