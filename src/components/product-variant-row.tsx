"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { nanoid } from "nanoid";

// shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Zgodne z definicją w productFormSchema
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

// Główny typ z "variants"
type ProductFormData = {
  variants: VariantForm[];
};

type ProductVariantRowProps = {
  field: any;                      // obiekt z useFieldArray => { id, ... }
  index: number;
  removeVariant: (index: number) => void;
};

export function ProductVariantRow({ field, index, removeVariant }: ProductVariantRowProps) {
  const { register, setValue, control, formState: { errors } } = useFormContext<ProductFormData>();

  // Obserwujemy wartości danego wariantu
  const variantValue = useWatch({
    name: `variants.${index}`,
    control,
  });
  // => { sku, name, price, priceInclTax, taxRate, variantAttributes }

  // Które pole user ostatnio edytował: "price" czy "priceInclTax"
  const lastChangedField = useRef<"price" | "priceInclTax" | null>(null);

  const onChangePrice = useCallback(() => {
    lastChangedField.current = "price";
  }, []);
  const onChangePriceInclTax = useCallback(() => {
    lastChangedField.current = "priceInclTax";
  }, []);

  // Dwustronne przeliczanie w useEffect
  useEffect(() => {
    if (!variantValue) return;
    const { price, priceInclTax, taxRate } = variantValue;
    const dec = taxRate / 100;

    if (lastChangedField.current === "price") {
      const newVal = price * (1 + dec);
      setValue(`variants.${index}.priceInclTax`, parseFloat(newVal.toFixed(2)));
    } else if (lastChangedField.current === "priceInclTax") {
      const newVal = priceInclTax / (1 + dec);
      setValue(`variants.${index}.price`, parseFloat(newVal.toFixed(2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantValue.price, variantValue.priceInclTax]);

  // Wyświetlamy ewentualne błędy walidacji z "variants[index]"
  const variantErrors = errors.variants?.[index] || {};

  return (
    <div className="border p-3 rounded mb-2">
      {/* Nazwa wariantu i SKU */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">Variant Name</label>
          <Input
            {...register(`variants.${index}.name`)}
            placeholder="Variant Name"
          />
          {variantErrors?.name && (
            <p className="text-red-500 text-sm">
              {(variantErrors.name as any).message}
            </p>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">SKU</label>
          <Input
            {...register(`variants.${index}.sku`)}
            placeholder="SKU"
            onBlur={(e) => {
              // Jeśli user skasuje SKU => nadaj nanoid
              if (!e.target.value) {
                setValue(`variants.${index}.sku`, nanoid());
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

      {/* Cena net/brutto + stawka */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">Price (net)</label>
          <Input
            type="number"
            step="0.01"
            {...register(`variants.${index}.price`, { valueAsNumber: true })}
            onChange={onChangePrice}
          />
          {variantErrors?.price && (
            <p className="text-red-500 text-sm">
              {(variantErrors.price as any).message}
            </p>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Price (incl. tax)</label>
          <Input
            type="number"
            step="0.01"
            {...register(`variants.${index}.priceInclTax`, { valueAsNumber: true })}
            onChange={onChangePriceInclTax}
          />
          {variantErrors?.priceInclTax && (
            <p className="text-red-500 text-sm">
              {(variantErrors.priceInclTax as any).message}
            </p>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Tax Rate (%)</label>
          <Input
            type="number"
            step="1"
            {...register(`variants.${index}.taxRate`, { valueAsNumber: true })}
          />
          {variantErrors?.taxRate && (
            <p className="text-red-500 text-sm">
              {(variantErrors.taxRate as any).message}
            </p>
          )}
        </div>
      </div>

      {/* Wyświetlanie atrybutów wariantu w trybie read-only */}
      {variantValue.variantAttributes?.length > 0 && (
        <div className="mb-2">
          <label className="block text-sm font-medium">Variant Attributes</label>
          <div className="ml-2 mt-1 space-y-1">
            {variantValue.variantAttributes.map((att, idxA) => (
              <div key={idxA} className="text-xs text-gray-600">
                {att.attributeName}: {att.attributeValue}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="destructive"
        onClick={() => removeVariant(index)}
      >
        Remove Variant
      </Button>
    </div>
  );
}
