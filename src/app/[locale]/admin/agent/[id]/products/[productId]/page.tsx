"use client";

import React, { useState, useCallback, useRef } from "react";
import { FormProvider, useForm, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { toast } from "sonner";

// shadcn-komponenty:
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { VariantRow } from "@/components/product-variant-row";  // podkomponent odpowiedzialny za pojedynczy wariant
import { FileUploadStatus, UploadedFile, Product } from "@/data/client/models"; 
// powyżej dostosuj importy do swojego kodu

import { useProductContext } from "@/contexts/product-context";

// TYPY formularza:
type AttributeForm = {
  attrName: string;
  attrType: "text" | "select";
  attrValues: string;  // np. "Red,Blue,Green"
};

type VariantForm = {
  sku: string;
  name: string;
  price: number;         // net
  priceInclTax: number;  // gross
  taxRate: number;       // w %
};

type ProductFormData = {
  name: string;
  description: string;
  sku: string;
  price: number;
  priceInclTax: number;
  taxRate: number;   // w %
  currency: string;
  attributes: AttributeForm[];
  tags: string;
  variants: VariantForm[];
};

// Waluty: najpierw faworyci, potem reszta
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

export default function ProductFormPage() {
  const { t, i18n } = useTranslation();
  const { updateProduct } = useProductContext();

  // Domyślna stawka VAT i waluta
  const defaultTaxRate = i18n.language === "pl" ? 23 : 0;
  const defaultCurrency = i18n.language === "pl" ? "PLN" : "USD";

  // Inicjalizacja formularza
  const methods = useForm<ProductFormData>({
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
  } = methods;

  // ATRYBUTY (useFieldArray)
  const {
    fields: attributeFields,
    append: appendAttribute,
    remove: removeAttribute,
  } = useFieldArray({ control, name: "attributes" });

  // WARIANTY (useFieldArray)
  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({ control, name: "variants" });

  // Generowanie wariantów z atrybutów typu select
  const generateVariantsFromAttributes = () => {
    const selects = attributeFields
      .filter((a) => a.attrType === "select")
      .map((a) => a.attrValues.split(",").map((v) => v.trim()).filter(Boolean));

    if (!selects.length || selects.some((arr) => !arr.length)) {
      toast.error("No valid 'select' attributes or empty values.");
      return;
    }
    // Iloczyn kartezjański
    const cartesian = (arrays: string[][]): string[][] =>
      arrays.reduce(
        (acc, curr) => acc.flatMap((prev) => curr.map((val) => [...prev, val])),
        [[]] as string[][]
      );
    const combos = cartesian(selects);

    combos.forEach((combo) => {
      appendVariant({
        sku: nanoid(),
        name: combo.join(" / "),
        price: 0,
        priceInclTax: 0,
        taxRate: defaultTaxRate,
      });
    });
  };

  // Dwustronne przeliczenie ceny w produkcie głównym
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

  // Reakcja na zmiany price → priceInclTax
  React.useEffect(() => {
    if (lastChangedMainField.current === "price") {
      const dec = mainTaxRate / 100;
      const newVal = mainPrice * (1 + dec);
      setValue("priceInclTax", parseFloat(newVal.toFixed(2)));
    }
  }, [mainPrice, mainTaxRate, setValue]);

  // Reakcja na zmiany priceInclTax → price
  React.useEffect(() => {
    if (lastChangedMainField.current === "priceInclTax") {
      const dec = mainTaxRate / 100;
      const newVal = mainPriceInclTax / (1 + dec);
      setValue("price", parseFloat(newVal.toFixed(2)));
    }
  }, [mainPriceInclTax, mainTaxRate, setValue]);

  // Pliki w stanie lokalnym
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Dodawanie plików -> auto upload
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

  // Usuwanie pliku z kolejki
  const removeFileFromQueue = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Upload konkretnego pliku
  const onUpload = useCallback(async (fileToUpload: UploadedFile) => {
    fileToUpload.status = FileUploadStatus.UPLOADING;
    setUploadedFiles((prev) => [...prev]);
    try {
      // np. formData + zapytanie do API
      await new Promise((res) => setTimeout(res, 1500)); // symulacja
      fileToUpload.status = FileUploadStatus.SUCCESS;
      fileToUpload.uploaded = true;
      setUploadedFiles((prev) => [...prev]);
    } catch (error) {
      fileToUpload.status = FileUploadStatus.ERROR;
      setUploadedFiles((prev) => [...prev]);
      toast.error("Error uploading file: " + String(error));
    }
  }, []);

  // Zapis formularza
  const onSubmit = async (formData: ProductFormData, addNext: boolean) => {
    // Konwersja stawki % -> ułamek
    const decimalTaxRate = formData.taxRate / 100;

    const newProduct = Product.fromForm({
      id: nanoid(),
      sku: formData.sku,
      name: formData.name,
      description: formData.description,
      price: { value: formData.price, currency: formData.currency },
      priceInclTax: { value: formData.priceInclTax, currency: formData.currency },
      taxRate: decimalTaxRate,
      attributes: formData.attributes.map((a) => ({
        name: a.attrName,
        type: a.attrType,
        possibleValues:
          a.attrType === "select"
            ? a.attrValues.split(",").map((v) => v.trim()).filter(Boolean)
            : [],
      })),
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t),
      variants: formData.variants.map((v) => ({
        id: nanoid(),
        sku: v.sku || nanoid(),
        name: v.name,
        price: { value: v.price, currency: formData.currency },
        priceInclTax: { value: v.priceInclTax, currency: formData.currency },
        taxRate: v.taxRate / 100,
      })),
    });

    try {
      const saved = await updateProduct(newProduct, true);
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
      toast.error(String(error));
      console.error("Error saving product:", error);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">Add / Edit Product</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit((data) => onSubmit(data, false))();
          }}
          className="space-y-6"
        >
          {/* Nazwa */}
          <div>
            <label className="block font-medium mb-1">Name</label>
            <Input
              {...register("name", { required: true })}
              placeholder="Product name..."
            />
          </div>

          {/* Opis */}
          <div>
            <label className="block font-medium mb-1">Description</label>
            <Textarea
              {...register("description")}
              placeholder="Describe your product..."
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block font-medium mb-1">Product SKU</label>
            <Input
              {...register("sku")}
              placeholder="SKU..."
            />
          </div>

          {/* Ceny */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-medium mb-1">Price (net)</label>
              <Input
                type="number"
                step="0.01"
                {...register("price")}
                onChange={onChangeMainPrice}
              />
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Price (incl. tax)</label>
              <Input
                type="number"
                step="0.01"
                {...register("priceInclTax")}
                onChange={onChangeMainPriceInclTax}
              />
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Tax Rate (%)</label>
              <Input
                type="number"
                step="1"
                {...register("taxRate")}
              />
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
            </div>
          </div>

          {/* Atrybuty */}
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
                  placeholder="Values (comma-separated)"
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

          {/* Tagi */}
          <div>
            <label className="block font-medium mb-2">Tags (comma separated)</label>
            <Input
              {...register("tags")}
              placeholder="e.g. 'new, sale, featured'"
            />
          </div>

          {/* WARIANTY */}
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
            {variantFields.map((field, index) => (
              <VariantRow
                key={field.id}
                field={field}
                index={index}
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
                })
              }
            >
              + Add Variant
            </Button>
          </div>

          {/* Pliki */}
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
            <Button
              type="submit"
              variant="default"
            >
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
