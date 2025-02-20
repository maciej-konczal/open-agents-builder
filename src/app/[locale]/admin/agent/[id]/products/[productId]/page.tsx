"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FileUploadStatus, Product, UploadedFile } from "@/data/client/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { uuid } from "drizzle-orm/pg-core";
// ↑ typy do obsługi uploadu, dopasuj do swojego kodu

// Przykładowy zestaw walut
const AVAILABLE_CURRENCIES = ["USD", "EUR", "PLN", "GBP", "CHF"];

type ProductFormData = {
  name: string;
  description: string;
  price: number;
  priceInclTax: number;
  taxRate: number;
  currency: string;
  // Atrybuty: tablica obiektów [ { name: "...", type: "...", possibleValues: "..." }, ... ]
  attributes: {
    attrName: string;
    attrType: "text" | "select";
    attrValues: string; // jeśli 'select', tu trzymamy wartości po przecinku
  }[];
  tags: string; // np. "tag1, tag2, tag3"
  // Pliki - nie integrujemy bezpośrednio z react-hook-form, bo to osobny flow
};

export default function ProductFormPage() {
  const { t, i18n } = useTranslation();
  const { updateProduct } = useProductContext();

  // Domyślna waluta w zależności od języka
  const defaultCurrency = i18n.language === "pl" ? "PLN" : "USD";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      priceInclTax: 0,
      taxRate: 0,
      currency: defaultCurrency,
      attributes: [],
      tags: "",
    },
  });

  // Reagujemy na zmianę price / taxRate => automatycznie liczymy priceInclTax
  const priceValue = watch("price");
  const taxRateValue = watch("taxRate");
  const priceInclTaxValue = watch("priceInclTax");

  useEffect(() => {
    // Kiedy zmienia się price lub taxRate, chcemy zaktualizować priceInclTax
    // priceInclTax = price * (1 + taxRate)
    const newVal = priceValue * (1 + taxRateValue);
    // Zaokrąglamy do 2 miejsc?
    setValue("priceInclTax", parseFloat(newVal.toFixed(2)));
  }, [priceValue, taxRateValue]);

  // Możemy też odwrotnie: jeśli user zmieni priceInclTax => recalc price
  // (ale wtedy mamy "pętlę" – należałoby ustawić warunek
  //  by nie liczyć, jeśli to my sami zaktualizowaliśmy)
  // Zależnie od preferencji możesz pominąć taką dwustronną synchronizację.

  // Atrybuty – dynamiczne pola
  const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } =
    useFieldArray({
      control,
      name: "attributes",
    });

  // Obsługa uploadu – pliki w local state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Przykładowa logika do dodawania plików (z input type="file" multiple)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((file, idx) => ({
      id: nanoid(),
      file,
      status: FileUploadStatus.QUEUED,
      uploaded: false,
    })) as UploadedFile[];
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  // Funkcja pomocnicza do aktualizacji stanu pojedynczego pliku
  const updateFile = useCallback(
    (fileToUpload: UploadedFile, allFiles: UploadedFile[]) => {
      setUploadedFiles([...allFiles]);
    },
    [uploadedFiles]
  );

  // Przykładowa funkcja uploadu (z Twojego `onInternalUpload` analogicznie)
  const onUpload = useCallback(
    async (fileToUpload: UploadedFile | null, allFiles: UploadedFile[]) => {
      if (!fileToUpload) return;
      try {
        fileToUpload.status = FileUploadStatus.UPLOADING;
        updateFile(fileToUpload, allFiles);

        // Tutaj twój FormData + ewentualne szyfrowanie, klucze itp.
        const formData = new FormData();
        formData.append("file", fileToUpload.file);

        // ... jak w Twoim kodzie: dołączenie attachmentDTO itp.
        //   formData.append("attachmentDTO", JSON.stringify(attachmentDTO));

        // Wywołanie API:
        //   const apiClient = new EncryptedAttachmentApiClient(...);
        //   const result = await apiClient.put(formData);

        // Symulacja sukcesu:
        await new Promise((res) => setTimeout(res, 1000));

        // Ustawiamy status:
        fileToUpload.status = FileUploadStatus.SUCCESS;
        fileToUpload.uploaded = true;
        updateFile(fileToUpload, allFiles);
      } catch (error) {
        console.error("File upload error", error);
        fileToUpload.status = FileUploadStatus.ERROR;
        updateFile(fileToUpload, allFiles);
        toast.error("File upload error " + error);
      }
    },
    [updateFile]
  );

  // Funkcja globalnego wywołania uploadu wszystkich plików
  const handleUploadAll = async () => {
    for (let file of uploadedFiles) {
      if (file.status === FileUploadStatus.QUEUED) {
        await onUpload(file, uploadedFiles);
      }
    }
    toast.success("All files uploaded!");
  };

  // Faktyczna funkcja submitu formularza
  const onSubmit = async (formData: ProductFormData, addNext: boolean) => {
    // Tworzymy obiekt Product z formData
    // Zakładamy, że w Product jest np. fromForm(...) lub konstruktor
    const newProduct = Product.fromForm({
      id: nanoid(), // lub do edycji, to tu wstawiasz istniejące ID
      name: formData.name,
      description: formData.description,
      price: { value: formData.price, currency: formData.currency },
      priceInclTax: { value: formData.priceInclTax, currency: formData.currency },
      taxRate: formData.taxRate,
      // Atrybuty
      attributes: formData.attributes.map((attr) => ({
        name: attr.attrName,
        type: attr.attrType,
        possibleValues: attr.attrType === "select"
          ? attr.attrValues.split(",").map((v) => v.trim())
          : [],
      })),
      // Tagi – rozdzielamy po przecinku
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      // ... reszta pól
    });

    try {
      const savedProduct = await updateProduct(newProduct, true);
      if (savedProduct?.id) {
        toast.success("Product saved!");

        if (addNext) {
          // Resetujemy formularz, by dodać kolejny
          reset();
          setUploadedFiles([]);
        }
      } else {
        toast.error("Error saving product");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving product: " + String(err));
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Add / Edit Product</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Domyślnie, kliknięcie Save -> onSubmit(false)
          handleSubmit((data) => onSubmit(data, false))();
        }}
        className="space-y-4"
      >
        {/* NAME */}
        <div>
          <label className="block font-medium mb-1">Name</label>
          <Input
            placeholder="Product name..."
            {...register("name", { required: true })}
          />
          {errors.name && (
            <p className="text-red-500 text-sm">Name is required</p>
          )}
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block font-medium mb-1">Description</label>
          <Textarea
            placeholder="Describe your product..."
            {...register("description")}
          />
        </div>

        {/* PRICE + TAX */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block font-medium mb-1">Price (net)</label>
            <Input type="number" step="0.01" {...register("price")} />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1">Tax Rate (e.g. 0.23)</label>
            <Input type="number" step="0.01" {...register("taxRate")} />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1">Price (incl. tax)</label>
            <Input type="number" step="0.01" {...register("priceInclTax")} />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1">Currency</label>
            <select {...register("currency")} className="border rounded p-2 w-full">
              {AVAILABLE_CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ATTRIBUTES */}
        <div>
          <label className="block font-medium mb-1">Attributes</label>
          {attributeFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2">
              <Input
                placeholder="Attribute name"
                {...register(`attributes.${index}.attrName`)}
              />
              <select
                {...register(`attributes.${index}.attrType`)}
                className="border rounded p-2"
              >
                <option value="text">Text</option>
                <option value="select">Select</option>
              </select>
              <Input
                placeholder="Possible values (comma separated)"
                {...register(`attributes.${index}.attrValues`)}
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => removeAttribute(index)}
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
          <label className="block font-medium mb-1">Tags (comma separated)</label>
          <Input {...register("tags")} />
        </div>

        {/* FILE UPLOADS */}
        <div>
          <label className="block font-medium mb-1">Upload Photos</label>
          <Input type="file" multiple onChange={handleFileSelect} />
          <Button type="button" onClick={handleUploadAll} className="mt-2">
            Upload all
          </Button>

          <div className="mt-2 space-y-1">
            {uploadedFiles.map((f) => (
              <div key={f.id} className="flex gap-2 items-center">
                <span>{f.file.name}</span>
                <span>
                  {f.status === FileUploadStatus.QUEUED && "QUEUED"}
                  {f.status === FileUploadStatus.UPLOADING && "UPLOADING..."}
                  {f.status === FileUploadStatus.SUCCESS && "DONE"}
                  {f.status === FileUploadStatus.ERROR && "ERROR"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-4 mt-6">
          <Button
            type="submit"
            variant="default"
            // Domyślnie handleSubmit((data) => onSubmit(data, false))
          >
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              // "Save and add next" => wywołujemy handleSubmit z addNext = true
              handleSubmit((data) => onSubmit(data, true))();
            }}
          >
            Save and add next
          </Button>
        </div>
      </form>
    </div>
  );
}
