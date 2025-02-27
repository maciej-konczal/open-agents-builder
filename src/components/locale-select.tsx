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
      <select
        id="locale"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        ref={ref}
        className="border border-1 border-input transition-colors mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
      >
        <option value="auto">{t("Not-set")}</option>
        <option value="en">{t("English")}</option>
        <option value="es">{t("Spanish")}</option>
        <option value="fr">{t("French")}</option>
        <option value="de">{t("German")}</option>
        <option value="it">{t("Italian")}</option>
        <option value="pt">{t("Portuguese")}</option>
        <option value="zh">{t("Chinese")}</option>
        <option value="ja">{t("Japanese")}</option>
        <option value="ko">{t("Korean")}</option>
        <option value="ru">{t("Russian")}</option>
        <option value="ar">{t("Arabic")}</option>
        <option value="hi">{t("Hindi")}</option>
        <option value="tr">{t("Turkish")}</option>
        <option value="id">{t("Indonesian")}</option>
        <option value="nl">{t("Dutch")}</option>
        <option value="sv">{t("Swedish")}</option>
        <option value="no">{t("Norwegian")}</option>
        <option value="da">{t("Danish")}</option>
        <option value="fi">{t("Finnish")}</option>
        <option value="pl">{t("Polish")}</option>
        <option value="uk">{t("Ukrainian")}</option>
        <option value="ro">{t("Romanian")}</option>
        <option value="bg">{t("Bulgarian")}</option>
        <option value="cs">{t("Czech")}</option>
        <option value="el">{t("Greek")}</option>
        <option value="hu">{t("Hungarian")}</option>
        <option value="vi">{t("Vietnamese")}</option>
        <option value="th">{t("Thai")}</option>
        <option value="he">{t("Hebrew")}</option>
      </select>

      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
    </div>
  );
}
