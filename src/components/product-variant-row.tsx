"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { nanoid } from "nanoid";

// shadcn
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Typ wariantu
type VariantForm = {
  sku: string;
  name: string;
  price: number;         // net
  priceInclTax: number;  // gross
  taxRate: number;       // w %
};

// Typ głównego formularza
type ProductFormData = {
  variants: VariantForm[];
};

type VariantRowProps = {
  field: any;             // obiekt z useFieldArray { id, ... }
  index: number;
  removeVariant: (index: number) => void;
};

export function VariantRow({ field, index, removeVariant }: VariantRowProps) {
  const { register, setValue, control } = useFormContext<ProductFormData>();

  // Odczyt aktualnych wartości wariantu
  const variantValue = useWatch({
    name: `variants.${index}`,
    control,
  });
  // => { sku, name, price, priceInclTax, taxRate }

  // Które pole ostatnio zmieniono: "price" czy "priceInclTax"?
  const lastChangedField = useRef<"price" | "priceInclTax" | null>(null);

  const onChangePrice = useCallback(() => {
    lastChangedField.current = "price";
  }, []);

  const onChangePriceInclTax = useCallback(() => {
    lastChangedField.current = "priceInclTax";
  }, []);

  // Dwustronne przeliczenie
  useEffect(() => {
    if (!variantValue) return;
    const { price, priceInclTax, taxRate } = variantValue;
    const decimal = taxRate / 100;

    if (lastChangedField.current === "price") {
      const newVal = price * (1 + decimal);
      setValue(`variants.${index}.priceInclTax`, parseFloat(newVal.toFixed(2)));
    } else if (lastChangedField.current === "priceInclTax") {
      const newVal = priceInclTax / (1 + decimal);
      setValue(`variants.${index}.price`, parseFloat(newVal.toFixed(2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantValue.price, variantValue.priceInclTax]);

  return (
    <div className="border p-3 rounded mb-2">
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">Variant Name</label>
          <Input
            {...register(`variants.${index}.name`)}
            placeholder="Variant Name"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">SKU</label>
          <Input
            {...register(`variants.${index}.sku`)}
            placeholder="SKU"
            onBlur={(e) => {
              // Jeśli usunięto SKU => generujemy nowy
              if (!e.target.value) {
                setValue(`variants.${index}.sku`, nanoid());
              }
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">Price (net)</label>
          <Input
            type="number"
            step="0.01"
            {...register(`variants.${index}.price`, { valueAsNumber: true })}
            onChange={onChangePrice}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Price (incl. tax)</label>
          <Input
            type="number"
            step="0.01"
            {...register(`variants.${index}.priceInclTax`, { valueAsNumber: true })}
            onChange={onChangePriceInclTax}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Tax Rate (%)</label>
          <Input
            type="number"
            step="1"
            {...register(`variants.${index}.taxRate`, { valueAsNumber: true })}
          />
        </div>
      </div>

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
