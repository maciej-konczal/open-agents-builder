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
import { promptTemplatesRegistry } from "@/prompts/prompt-templates-registry";

export function AgentTypeSelect() {
  const { t, i18n } = useTranslation();

  // Access form methods from context (requires <FormProvider> in the parent).
  const { control } = useFormContext();

  // Tie the `Select` to the "locale" field using React Hook Form's useController
  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({
    name: "promptTemplate", 
    control,
    rules: { required: t("This field is required") },
    // Optionally set a default value here or in the parent useForm({ defaultValues: { locale: ... } }).
    defaultValue: "",
  });

  return (
    <div>
      <Select value={value} onValueChange={onChange} onBlur={onBlur} ref={ref}>
        <SelectTrigger
          id="locale"
          className="mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <SelectValue placeholder={t("Select agent type")} />
        </SelectTrigger>

        <SelectContent>
          {promptTemplatesRegistry.filter(at => at.locale === i18n.language).map((at) => (
            <SelectItem value={at.template}>{at.displayName}</SelectItem>
          ))}          
        </SelectContent>
      </Select>

      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
    </div>
  );
}
