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

export function LocaleSelect() {
  const { t } = useTranslation();

  // Access form methods from context (requires <FormProvider> in the parent).
  const { control } = useFormContext();

  // Tie the `Select` to the "locale" field using React Hook Form's useController
  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({
    name: "locale", 
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
          <SelectValue placeholder={t("Select a language")} />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="en">{t("English")}</SelectItem>
          <SelectItem value="es">{t("Spanish")}</SelectItem>
          <SelectItem value="fr">{t("French")}</SelectItem>
          <SelectItem value="de">{t("German")}</SelectItem>
          <SelectItem value="it">{t("Italian")}</SelectItem>
          <SelectItem value="pt">{t("Portuguese")}</SelectItem>
          <SelectItem value="zh">{t("Chinese")}</SelectItem>
          <SelectItem value="ja">{t("Japanese")}</SelectItem>
          <SelectItem value="ko">{t("Korean")}</SelectItem>
          <SelectItem value="ru">{t("Russian")}</SelectItem>
          <SelectItem value="ar">{t("Arabic")}</SelectItem>
          <SelectItem value="hi">{t("Hindi")}</SelectItem>
          <SelectItem value="tr">{t("Turkish")}</SelectItem>
          <SelectItem value="id">{t("Indonesian")}</SelectItem>
          <SelectItem value="nl">{t("Dutch")}</SelectItem>
          <SelectItem value="sv">{t("Swedish")}</SelectItem>
          <SelectItem value="no">{t("Norwegian")}</SelectItem>
          <SelectItem value="da">{t("Danish")}</SelectItem>
          <SelectItem value="fi">{t("Finnish")}</SelectItem>
          <SelectItem value="pl">{t("Polish")}</SelectItem>
          <SelectItem value="uk">{t("Ukrainian")}</SelectItem>
          <SelectItem value="ro">{t("Romanian")}</SelectItem>
          <SelectItem value="bg">{t("Bulgarian")}</SelectItem>
          <SelectItem value="cs">{t("Czech")}</SelectItem>
          <SelectItem value="el">{t("Greek")}</SelectItem>
          <SelectItem value="hu">{t("Hungarian")}</SelectItem>
          <SelectItem value="vi">{t("Vietnamese")}</SelectItem>
          <SelectItem value="th">{t("Thai")}</SelectItem>
          <SelectItem value="he">{t("Hebrew")}</SelectItem>
        </SelectContent>
      </Select>

      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
    </div>
  );
}
