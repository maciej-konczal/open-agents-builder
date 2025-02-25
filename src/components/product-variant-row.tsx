"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";

// shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { defaultVariantSku } from "@/data/client/models";

// Definicja atrybutu wariantu
type VariantAttribute = {
  attributeName: string;
  attributeValue: string;
};

type VariantForm = {
  sku: string;
  name: string;
  price: number;         // net
  priceInclTax: number;  // gross
  taxRate: number;       // w %
  variantAttributes: VariantAttribute[];
};

type ProductFormData = {
  variants: VariantForm[];
};

type ProductVariantRowProps = {
  field: any;                      // obiekt z useFieldArray => { id, ... }
  index: number;
  removeVariant: (index: number) => void;
};

export function ProductVariantRow({ field, index, removeVariant }: ProductVariantRowProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<ProductFormData>();

  const variantValue = useWatch({
    name: `variants.${index}`,
    control,
  });
  // => { sku, name, price, priceInclTax, taxRate, variantAttributes }

  const variantErrors = errors.variants?.[index] || {};

  const { t } = useTranslation();

  const lastChangedField = useRef<"price" | "priceInclTax" | null>(null);

  const onChangePrice = useCallback(() => {
    lastChangedField.current = "price";
  }, []);

  const onChangePriceInclTax = useCallback(() => {
    lastChangedField.current = "priceInclTax";
  }, []);

  // useEffect do obliczania "brutto" => priceInclTax
  useEffect(() => {
    if (!variantValue) return;
    if (lastChangedField.current === "price") {
      const { price, taxRate } = variantValue;
      const dec = taxRate / 100; // np. 23 => 0.23
      const newVal = price * (1 + dec);
      setValue(
        `variants.${index}.priceInclTax`,
        parseFloat(newVal.toFixed(2))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantValue?.price, variantValue?.taxRate]);

  useEffect(() => {
    if (!variantValue) return;
    if (lastChangedField.current === "priceInclTax") {
      const { priceInclTax, taxRate } = variantValue;
      const dec = taxRate / 100;
      const newVal = priceInclTax / (1 + dec);
      setValue(`variants.${index}.price`, parseFloat(newVal.toFixed(2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantValue?.priceInclTax, variantValue?.taxRate]);

  return (
    <div className="border p-3 rounded mb-2">
      <div className="flex gap-2 mb-2">
        {/* Nazwa wariantu */}
        <div className="flex-1">
          <label className="block text-sm font-medium">{t('Variant Name')}</label>
          <Input
            {...register(`variants.${index}.name`)}
            placeholder={t("Variant Name")}
          />
          {variantErrors?.name && (
            <p className="text-red-500 text-sm">
              {(variantErrors.name as any).message}
            </p>
          )}
        </div>

        {/* SKU */}
        <div className="flex-1">
          <label className="block text-sm font-medium">{t('SKU')}</label>
          <Input
            {...register(`variants.${index}.sku`)}
            placeholder={t("SKU")}
            onBlur={(e) => {
              if (!e.target.value) {
                setValue(`variants.${index}.sku`, defaultVariantSku() + '-' +index);
              }
            }}
          />
          {variantErrors?.sku && (
            <p className="text-red-500 text-sm">
              {(variantErrors.sku as any).message}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        {/* Price - NET */}
        <div className="flex-1">
          <label className="block text-sm font-medium">{t('Price (net)')}</label>
          <Input
            type="number"
            step="0.01"
            {...register(`variants.${index}.price`, {
              valueAsNumber: true,
            })}
            onMouseDown={onChangePrice}
            onKeyDown={onChangePrice}
          />
          {variantErrors?.price && (
            <p className="text-red-500 text-sm">
              {(variantErrors.price as any).message}
            </p>
          )}
        </div>

        {/* Price incl. tax - GROSS */}
        <div className="flex-1">
          <label className="block text-sm font-medium">{t('Price (incl. tax)')}</label>
          <Input
            type="number"
            step="0.01"
            {...register(`variants.${index}.priceInclTax`, {
              valueAsNumber: true,
            })}
            onMouseDown={onChangePriceInclTax}
            onKeyDown={onChangePriceInclTax}
          />
          {variantErrors?.priceInclTax && (
            <p className="text-red-500 text-sm">
              {(variantErrors.priceInclTax as any).message}
            </p>
          )}
        </div>

        {/* Stawka podatku (%) */}
        <div className="flex-1">
          <label className="block text-sm font-medium">{t('Tax Rate (%)')}</label>
          <Input
            type="number"
            step="1"
            {...register(`variants.${index}.taxRate`, {
              valueAsNumber: true,
            })}
          />
          {variantErrors?.taxRate && (
            <p className="text-red-500 text-sm">
              {(variantErrors.taxRate as any).message}
            </p>
          )}
        </div>
      </div>

      {variantValue?.variantAttributes?.length > 0 && (
        <div className="mb-2">
          <label className="block text-sm font-medium">{t('Variant Attributes')}</label>
          <div className="ml-2 mt-1 space-y-1">
            {variantValue.variantAttributes.map((att: any, idxA: number) => (
              <div key={idxA} className="text-xs text-gray-600">
                {att.attributeName}: {att.attributeValue}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        size={"sm"}
        variant="outline"
        onClick={() => removeVariant(index)}
      >
        <TrashIcon className="w-4 h-4" /> {t('Remove variant')}
        </Button>
    </div>
  );
}
