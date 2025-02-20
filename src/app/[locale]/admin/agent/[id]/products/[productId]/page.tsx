"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { FormProvider, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { ProductVariantRow } from "@/components/product-variant-row";
import { FileUploadStatus, UploadedFile, Product } from "@/data/client/models";
import { useProductContext } from "@/contexts/product-context";
import { getErrorMessage } from "@/lib/utils";

// ----------------------------------------------------
// 1) Schemat walidacji Zod
// ----------------------------------------------------

const attributeFormSchema = z.object({
  attrName: z.string().nonempty("Attribute name is required"),
  attrType: z.enum(["text", "select"]),
  attrValues: z.string().optional(), 
  // Uwaga: to jest surowe pole inputu; w bazie, jeśli "select", zrobimy tablicę
  //        jeśli "text", zapiszemy jedną pozycję w values
});

const variantAttributeSchema = z.object({
  attributeName: z.string().nonempty(),
  attributeValue: z.string().nonempty(),
});

const variantFormSchema = z.object({
  sku: z.string().nonempty("SKU is required"),
  name: z.string().nonempty("Variant name is required"),
  price: z.number().min(0, "Price must be >= 0"),
  priceInclTax: z.number().min(0, "Price incl. tax must be >= 0"),
  taxRate: z.number().min(0).max(100),
  variantAttributes: z.array(variantAttributeSchema),
});

const productFormSchema = z.object({
  name: z.string().nonempty("Name is required"),
  description: z.string().optional(),
  sku: z.string().nonempty("SKU is required"),

  price: z.number().min(0, "Price (net) must be >= 0"),
  priceInclTax: z.number().min(0, "Price (incl. tax) must be >= 0"),
  taxRate: z.number().min(0).max(100),

  currency: z.string().nonempty(),

  attributes: z.array(attributeFormSchema),
  tags: z.string().optional(),

  variants: z.array(variantFormSchema),
});

type ProductFormData = z.infer<typeof productFormSchema>;

// ----------------------------------------------------
// 2) Waluty
// ----------------------------------------------------
const FAVOURITE_CURRENCIES = ["EUR", "USD", "PLN", "GBP", "CHF"];
const ALL_CURRENCIES = [
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTN","BWP","BYN","BZD",
  "CAD","CDF","CLP","CNY","COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","FJD","FKP","GEL","GGP","GHS","GIP","GMD","GNF","GTQ",
  "GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","INR","IQD","IRR","ISK","JEP","JMD","JOD","JPY","KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD",
  "KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK",
  "NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLL","SOS","SPL","SRD","STN",
  "SVC","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TVD","TWD","TZS","UAH","UGX","UYU","UZS","VEF","VND","VUV","WST","XAF","XCD","XDR","XOF",
  "XPF","YER","ZAR","ZMW","ZWD"
];
const sortedCurrencyList = [
  ...FAVOURITE_CURRENCIES,
  ...ALL_CURRENCIES.filter((c) => !FAVOURITE_CURRENCIES.includes(c)),
];

// ----------------------------------------------------
// 3) Główny komponent formularza
// ----------------------------------------------------
export default function ProductFormPage() {
  const { t, i18n } = useTranslation();
  const productContext = useProductContext();
  const params = useParams();

  // Domyślne stawki i waluty
  const defaultTaxRate = i18n.language === "pl" ? 23 : 0;
  const defaultCurrency = i18n.language === "pl" ? "PLN" : "USD";

  // 3a) Inicjalizacja formularza (Zod, domyślne wartości)
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: nanoid(),
      price: 0,
      priceInclTax: 0,
      taxRate: defaultTaxRate,
      currency: defaultCurrency,
      attributes: [],
      tags: "",
      variants: [],
    },
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors },
  } = methods;

  // 3b) Ładowanie produktu do edycji
  useEffect(() => {
    if (!params?.productId) return;
    if (params.productId !== "new") {
      loadProduct(params.productId);
    } else {
      // new
      reset();
    }
  }, [params?.productId]);

  async function loadProduct(productId: string) {
    try {
      const loadedDto = await productContext.loadProduct(productId);
      if (!loadedDto) {
        toast.error("Product not found!");
        return;
      }
      const formData: ProductFormData = mapDtoToFormData(loadedDto);
      reset(formData);
    } catch (err) {
      console.error(err);
      toast.error("Error loading product: " + getErrorMessage(err));
    }
  }

  // Funkcja mapująca ProductDTO -> ProductFormData
  function mapDtoToFormData(loadedDto: any): ProductFormData {
    const taxRatePercent = (loadedDto.taxRate || 0) * 100;
    return {
      name: loadedDto.name || "",
      description: loadedDto.description || "",
      sku: loadedDto.sku || nanoid(),
      price: loadedDto.price?.value || 0,
      priceInclTax: loadedDto.priceInclTax?.value || 0,
      taxRate: taxRatePercent > 100 ? 100 : taxRatePercent,
      currency: loadedDto.price?.currency || defaultCurrency,
      attributes: (loadedDto.attributes || []).map((a: any) => ({
        attrName: a.name,
        attrType: a.type,
        // scalamy values -> jednego stringa
        attrValues: a.values ? a.values.join(",") : "",
      })),
      tags: (loadedDto.tags || []).join(", "),
      variants: (loadedDto.variants || []).map((v: any) => ({
        sku: v.sku || nanoid(),
        name: v.name || "",
        price: v.price?.value || 0,
        priceInclTax: v.priceInclTax?.value || 0,
        taxRate: (v.taxRate || 0) * 100,
        variantAttributes: v.variantAttributes || [],
      })),
    };
  }

  // 4) Obsługa atrybutów (useFieldArray)
  const {
    fields: attributeFields,
    append: appendAttribute,
    remove: removeAttribute,
  } = useFieldArray({ control, name: "attributes" });

  // 5) Obsługa wariantów (useFieldArray)
  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({ control, name: "variants" });

  // 5a) Generowanie wariantów z atrybutów typu select
  function generateVariantsFromAttributes() {
    const rawAttrs = watch("attributes");
    type SelectAttr = { attrName: string; values: string[] };
    const selectAttributes: SelectAttr[] = rawAttrs
      .filter((a) => a.attrType === "select")
      .map((a) => ({
        attrName: a.attrName,
        values: (a.attrValues || "")
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0),
      }));

    if (!selectAttributes.length || selectAttributes.some((sa) => !sa.values.length)) {
      toast.error("No valid select attributes or empty values.");
      return;
    }

    const combos = buildVariantCombinations(selectAttributes);
    const defaultTax = watch("taxRate");

    combos.forEach((combo) => {
      const variantName = combo.map((x) => x.attributeValue).join(" / ");
      appendVariant({
        sku: nanoid(),
        name: variantName,
        price: 0,
        priceInclTax: 0,
        taxRate: defaultTax,
        variantAttributes: combo,
      });
    });
  }

  // Iloczyn kartezjański
  function buildVariantCombinations(
    selectAttrs: { attrName: string; values: string[] }[],
    index = 0,
    current: { attributeName: string; attributeValue: string }[] = [],
    result: { attributeName: string; attributeValue: string }[][] = []
  ): { attributeName: string; attributeValue: string }[][] {
    if (index >= selectAttrs.length) {
      result.push(current);
      return result;
    }
    const { attrName, values } = selectAttrs[index];
    for (const val of values) {
      buildVariantCombinations(
        selectAttrs,
        index + 1,
        [...current, { attributeName: attrName, attributeValue: val }],
        result
      );
    }
    return result;
  }

  // 6) Dwustronne przeliczanie ceny głównej
  const mainPrice = watch("price");
  const mainPriceInclTax = watch("priceInclTax");
  const mainTaxRate = watch("taxRate");
  const lastChangedMainField = useRef<"price" | "priceInclTax" | null>(null);

  const onChangeMainPrice = () => {
    lastChangedMainField.current = "price";
  };
  const onChangeMainPriceInclTax = () => {
    lastChangedMainField.current = "priceInclTax";
  };

  // Reakcja: kiedy mainPrice się zmienia
  useEffect(() => {
    if (lastChangedMainField.current === "price") {
      const dec = mainTaxRate / 100;
      const newVal = mainPrice * (1 + dec);
      setValue("priceInclTax", parseFloat(newVal.toFixed(2)));
    }
  }, [mainPrice, mainTaxRate, setValue]);

  // Reakcja: kiedy mainPriceInclTax się zmienia
  useEffect(() => {
    if (lastChangedMainField.current === "priceInclTax") {
      const dec = mainTaxRate / 100;
      const newVal = mainPriceInclTax / (1 + dec);
      setValue("price", parseFloat(newVal.toFixed(2)));
    }
  }, [mainPriceInclTax, mainTaxRate, setValue]);

  // 7) Upload plików
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((file) => ({
      id: nanoid(),
      file,
      status: FileUploadStatus.QUEUED,
      uploaded: false,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => onUpload(f));
  };

  const removeFileFromQueue = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const onUpload = useCallback(async (fileToUpload: UploadedFile) => {
    fileToUpload.status = FileUploadStatus.UPLOADING;
    setUploadedFiles((prev) => [...prev]);
    try {
      // Symulacja
      await new Promise((res) => setTimeout(res, 1500));
      fileToUpload.status = FileUploadStatus.SUCCESS;
      fileToUpload.uploaded = true;
      setUploadedFiles((prev) => [...prev]);
    } catch (error) {
      fileToUpload.status = FileUploadStatus.ERROR;
      setUploadedFiles((prev) => [...prev]);
      toast.error("File upload error: " + String(error));
    }
  }, []);

  // 8) Submit
  const onSubmit = async (formData: ProductFormData, addNext: boolean) => {
    // Stawka w ułamku
    const decimalTaxRate = formData.taxRate / 100;

    // Budujemy docelowy obiekt
    const newProduct = Product.fromForm({
      // Jeżeli edycja => params.productId
      id: (params?.productId && params.productId !== "new") ? params.productId : nanoid(),

      sku: formData.sku,
      name: formData.name,
      description: formData.description,

      price: { value: formData.price, currency: formData.currency },
      priceInclTax: { value: formData.priceInclTax, currency: formData.currency },
      taxRate: decimalTaxRate,

      // Atrybuty
      attributes: formData.attributes.map((a) => {
        // interpretacja pola a.attrValues
        // - jeśli select => to tablica wartości
        // - jeśli text => to 1-elementowa tablica (przechowujemy to w values)
        let possibleVals: string[] = [];
        if (a.attrType === "select") {
          possibleVals = (a.attrValues || "")
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v.length > 0);
        } else {
          // typ: text => wrzucamy do values jedną wartość 
          // (tak by w bazie w polu "values" mieć to co user wpisał)
          if (a.attrValues && a.attrValues.trim().length > 0) {
            possibleVals = [a.attrValues.trim()];
          } else {
            possibleVals = [];
          }
        }
        return {
          name: a.attrName,
          type: a.attrType,
          values: possibleVals,
          defaultValue: possibleVals[0] || "",
        };
      }),

      // Tagi
      tags: (formData.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t),

      // Warianty
      variants: formData.variants.map((v) => ({
        id: nanoid(),
        sku: v.sku || nanoid(),
        name: v.name,
        price: { value: v.price, currency: formData.currency },
        priceInclTax: { value: v.priceInclTax, currency: formData.currency },
        taxRate: v.taxRate / 100,
        variantAttributes: v.variantAttributes,
      })),
    });

    try {
      const saved = await productContext.updateProduct(newProduct, true);
      if (saved?.id) {
        toast.success("Product saved!");
        if (addNext) {
          reset();
          setUploadedFiles([]);
        }
      } else {
        toast.error("Error saving product");
      }
    } catch (error) {
      toast.error("Error saving product: " + String(error));
      console.error(error);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">
          {params?.productId && params.productId !== "new"
            ? `Edit Product: ${params.productId}`
            : "Add / Edit Product"}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit((data) => onSubmit(data, false))();
          }}
          className="space-y-6"
        >
          {/* NAME */}
          <div>
            <label className="block font-medium mb-1">Name</label>
            <Input
              {...register("name")}
              placeholder="Product name..."
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block font-medium mb-1">Description</label>
            <Textarea
              {...register("description")}
              placeholder="Describe your product..."
            />
            {errors.description && (
              <p className="text-red-500 text-sm">
                {errors.description.message as string}
              </p>
            )}
          </div>

          {/* SKU */}
          <div>
            <label className="block font-medium mb-1">Product SKU</label>
            <Input
              {...register("sku")}
              placeholder="SKU..."
            />
            {errors.sku && (
              <p className="text-red-500 text-sm">
                {errors.sku.message as string}
              </p>
            )}
          </div>

          {/* PRICE / TAX */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-medium mb-1">Price (net)</label>
              <Input
                type="number"
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                onChange={() => {
                  // user zmienia price => zapamiętujemy w lastChangedMainField
                  lastChangedMainField.current = "price";
                }}
              />
              {errors.price && (
                <p className="text-red-500 text-sm">
                  {errors.price.message as string}
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Price (incl. tax)</label>
              <Input
                type="number"
                step="0.01"
                {...register("priceInclTax", { valueAsNumber: true })}
                onChange={() => {
                  lastChangedMainField.current = "priceInclTax";
                }}
              />
              {errors.priceInclTax && (
                <p className="text-red-500 text-sm">
                  {errors.priceInclTax.message as string}
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Tax Rate (%)</label>
              <Input
                type="number"
                step="1"
                {...register("taxRate", { valueAsNumber: true })}
              />
              {errors.taxRate && (
                <p className="text-red-500 text-sm">
                  {errors.taxRate.message as string}
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Currency</label>
              <select className="border rounded p-2 w-full" {...register("currency")}>
                {sortedCurrencyList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.currency && (
                <p className="text-red-500 text-sm">
                  {errors.currency.message as string}
                </p>
              )}
            </div>
          </div>

          {/* ATTRIBUTES */}
          <div>
            <label className="block font-medium mb-2">Attributes</label>
            {attributeFields.map((field, i) => (
              <div key={field.id} className="flex gap-2 mb-2">
                <Input
                  {...register(`attributes.${i}.attrName`)}
                  placeholder="Attribute name"
                />
                <select
                  className="border rounded p-2"
                  {...register(`attributes.${i}.attrType`)}
                >
                  <option value="text">Text</option>
                  <option value="select">Select</option>
                </select>
                <Input
                  {...register(`attributes.${i}.attrValues`)}
                  placeholder="Values (comma-separated for select; single text otherwise)"
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removeAttribute(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                appendAttribute({
                  attrName: "",
                  attrType: "text",
                  attrValues: "",
                })
              }
            >
              + Add attribute
            </Button>
          </div>

          {/* TAGS */}
          <div>
            <label className="block font-medium mb-2">Tags (comma separated)</label>
            <Input {...register("tags")} placeholder="e.g. 'new, sale, featured'" />
            {errors.tags && (
              <p className="text-red-500 text-sm">
                {errors.tags.message as string}
              </p>
            )}
          </div>

          {/* VARIANTS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-medium">Variants</label>
              <Button
                type="button"
                variant="outline"
                onClick={generateVariantsFromAttributes}
              >
                Generate variants
              </Button>
            </div>
            {variantFields.map((field, idx) => (
              <ProductVariantRow
                key={field.id}
                field={field}
                index={idx}
                removeVariant={removeVariant}
              />
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                appendVariant({
                  sku: nanoid(),
                  name: "",
                  price: 0,
                  priceInclTax: 0,
                  taxRate: defaultTaxRate,
                  variantAttributes: [],
                })
              }
            >
              + Add Variant
            </Button>
          </div>

          {/* UPLOAD PLIKÓW */}
          <div>
            <label className="block font-medium mb-2">Photos</label>
            <Input type="file" multiple onChange={handleFileSelect} />
            <div className="mt-2 space-y-2">
              {uploadedFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <span className="flex-1">
                    {f.file.name} - {f.status}
                  </span>
                  {f.status === FileUploadStatus.ERROR && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onUpload(f)}
                    >
                      Retry
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeFileFromQueue(f.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* PRZYCISKI */}
          <div className="flex gap-4 mt-6">
            <Button type="submit" variant="default">
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                handleSubmit((data) => onSubmit(data, true))();
              }}
            >
              Save and add next
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
