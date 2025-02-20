"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import {
  FileUploadStatus,
  Product,
  UploadedFile,
} from "@/data/client/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProductContext } from "@/contexts/product-context";

// Możesz wstawić je tuż nad komponentem ProductFormPage:
const FAVOURITE_CURRENCIES = ["EUR", "USD", "PLN", "GBP", "CHF"];

// Przykładowa lista z ISO 4217 i innymi (posortowana alfabetycznie):
const ALL_CURRENCIES = [
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTN","BWP","BYN","BZD",
  "CAD","CDF","CLP","CNY","COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","FJD","FKP","GEL","GGP","GHS","GIP","GMD","GNF","GTQ",
  "GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","INR","IQD","IRR","ISK","JEP","JMD","JOD","JPY","KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD",
  "KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK",
  "NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLL","SOS","SPL","SRD","STN",
  "SVC","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TVD","TWD","TZS","UAH","UGX","UYU","UZS","VEF","VND","VUV","WST","XAF","XCD","XDR","XOF",
  "XPF","YER","ZAR","ZMW","ZWD"
];

// Łączymy listę w taki sposób:
// 1) Najpierw FAVOURITE_CURRENCIES w ustalonej kolejności
// 2) Pozostałe z ALL_CURRENCIES, których nie ma w FAVOURITE_CURRENCIES
const sortedCurrencyList = [
  ...FAVOURITE_CURRENCIES,
  ...ALL_CURRENCIES.filter((c) => !FAVOURITE_CURRENCIES.includes(c)),
];


/** Definicja jednego wariantu w formularzu */
type VariantForm = {
  sku: string;
  name: string;
  price: number;
  priceInclTax: number;
  taxRate: number; // w % (np. 23)
};

/** Atrybut w formularzu */
type AttributeForm = {
  attrName: string;
  attrType: "text" | "select";
  attrValues: string; // gdy select, przechowuje wartości oddzielone przecinkami
};

/** Główny typ formularza */
type ProductFormData = {
  // Pola główne produktu
  name: string;
  description: string;
  sku: string;
  price: number; // netto
  priceInclTax: number; // brutto
  taxRate: number; // w procentach, np. 23
  currency: string;

  attributes: AttributeForm[];
  tags: string; // np. "tag1, tag2"

  // Warianty
  variants: VariantForm[];
};

export default function ProductFormPage() {
  const { t, i18n } = useTranslation();
  const { updateProduct } = useProductContext();

  // Domyślny VAT: 23% jeśli PL, 0% w innym wypadku
  const defaultTaxRate = i18n.language === "pl" ? 23 : 0;

  // Domyślna waluta
  const defaultCurrency = i18n.language === "pl" ? "PLN" : "USD";

  /** Inicjalizacja formularza */
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      description: "",
      sku: nanoid(), // SKU dla produktu głównego (opcjonalnie)
      price: 0,
      priceInclTax: 0,
      taxRate: defaultTaxRate,
      currency: defaultCurrency,
      attributes: [],
      tags: "",
      variants: [],
    },
  });

  /** FieldArray dla atrybutów */
  const {
    fields: attributeFields,
    append: appendAttribute,
    remove: removeAttribute,
  } = useFieldArray({
    control,
    name: "attributes",
  });

  /** FieldArray dla wariantów */
  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    update: updateVariantFormField,
  } = useFieldArray({
    control,
    name: "variants",
  });

  /**
   * Obserwujemy główne pola produktu do dwustronnego przeliczenia ceny
   * (price <-> priceInclTax) w zależności od taxRate w % (np. 23 -> 0.23)
   */
  const mainPrice = watch("price");
  const mainPriceInclTax = watch("priceInclTax");
  const mainTaxRatePercent = watch("taxRate"); // np. 23

  // useRef do śledzenia ostatniego pola (net/brutto) które user edytował
  const lastChangedMainField = useRef<"price" | "priceInclTax" | null>(null);

  // Gdy user wpisze w pole "price", to w onChange od razu lastChanged = "price"
  // Podobnie dla "priceInclTax".
  // Możemy to zrobić przez 'onChange' w <Input> albo przez watchEffect.
  // Dla uproszczenia zrobimy to w watchEffect:
  useEffect(() => {
    // sprawdź, czy wartość w formularzu "price" jest inna niż poprzednia
    // i czy user tam coś dopiero co zmienił
    // Tutaj w uproszczeniu – jeśli lastChanged = null => ustal "price"
    // lub sprawdzamy, czy difference jest > 0.01 itp.

    // Ale lepsze i prostsze bywa: event onChange w samym input. 
    // (tu demonstruję watchEffect z "lastChangedMainField".)

    // Równolegle musimy unikać pętli. Gdy zmieniamy price => liczymy priceInclTax.
    const taxRateDecimal = mainTaxRatePercent / 100; // z 23 => 0.23

    if (lastChangedMainField.current === "price") {
      const newPriceInclTax = mainPrice * (1 + taxRateDecimal);
      setValue("priceInclTax", parseFloat(newPriceInclTax.toFixed(2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainPrice]);

  useEffect(() => {
    const taxRateDecimal = mainTaxRatePercent / 100;
    if (lastChangedMainField.current === "priceInclTax") {
      // price = priceInclTax / (1 + stawka)
      const newPrice = mainPriceInclTax / (1 + taxRateDecimal);
      setValue("price", parseFloat(newPrice.toFixed(2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainPriceInclTax]);

  // Poniższe 2 funkcje przypisujemy do onChange w inputach "price" i "priceInclTax"
  // by ustawić lastChangedMainField.current
  const onChangeMainPrice = () => {
    lastChangedMainField.current = "price";
  };
  const onChangeMainPriceInclTax = () => {
    lastChangedMainField.current = "priceInclTax";
  };

  /**
   * Obsługa analogiczna dla wariantów – musimy w pętli 
   * zarejestrować watchers i do dwustronnego wyliczania
   * (robimy to dynamicznie w renderze).
   */

  /**
   * Generowanie wariantów na podstawie "select" atrybutów:
   * - zbieramy tablice "select" z możliwymi values
   * - robimy iloczyn kartezjański
   * - dla każdej kombinacji -> tworzymy VariantForm
   */
  const generateVariantsFromAttributes = () => {
    // 1) pobierz attributes z getValues
    const allAttrs = attributeFields; // z useFieldArray
    const selects = allAttrs
      .filter((a) => a.attrType === "select")
      .map((a) => a.attrValues.split(",").map((v) => v.trim()).filter(Boolean));

    // Jeżeli brak atrybutów typu select lub które mają zero values => return
    if (!selects.length || selects.some((arr) => arr.length === 0)) {
      toast.error("No valid select attributes or no values to generate variants.");
      return;
    }

    // 2) iloczyn kartezjański
    const cartesian = (arrays: string[][]): string[][] => {
      // rekurencyjnie lub iteracyjnie
      return arrays.reduce<string[][]>(
        (acc, curr) =>
          acc.flatMap((prev) => curr.map((val) => [...prev, val])),
        [[]]
      );
    };
    const combinations = cartesian(selects); // np. [ ['Red','XL'], ['Red','L'], ...]

    // 3) Mapujemy każdą kombinację do obiektu VariantForm
    const newVariants = combinations.map<VariantForm>((combo) => {
      return {
        sku: nanoid(),
        name: combo.join(" / "),
        price: 0,
        priceInclTax: 0,
        taxRate: defaultTaxRate,
      };
    });

    // 4) Dodajemy do istniejących wariantów (append)
    newVariants.forEach((v) => appendVariant(v));
  };

  /** Obsługa plików (queued, remove, auto-upload) */
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Po wybraniu plików -> dodaj do stanu i od razu upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((file) => ({
      id: nanoid(),
      file,
      status: FileUploadStatus.QUEUED,
      uploaded: false,
    })) as UploadedFile[];

    // Ustaw w stanie
    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Auto-upload:
    newFiles.forEach((fileItem) => onUpload(fileItem));
  };

  // Usunięcie pliku z kolejki (jeszcze nie wrzuconego lub wrzuconego)
  const removeFileFromQueue = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Funkcja uploadu pojedynczego pliku
  const onUpload = useCallback(
    async (fileToUpload: UploadedFile) => {
      // Zaznacz UPLOADING
      fileToUpload.status = FileUploadStatus.UPLOADING;
      setUploadedFiles((prev) => [...prev]);

      try {
        // Tworzysz FormData:
        const formData = new FormData();
        formData.append("file", fileToUpload.file);

        // Wywołujesz Twój endpoint, np.:
        // const apiClient = new EncryptedAttachmentApiClient(...);
        // const result = await apiClient.put(formData);

        // Tu symulacja:
        await new Promise((res) => setTimeout(res, 1500));

        // Sukces:
        fileToUpload.status = FileUploadStatus.SUCCESS;
        fileToUpload.uploaded = true;
        setUploadedFiles((prev) => [...prev]);
      } catch (error) {
        fileToUpload.status = FileUploadStatus.ERROR;
        setUploadedFiles((prev) => [...prev]);
        toast.error("Error uploading file: " + String(error));
      }
    },
    []
  );

  /**
   * Obsługa zapisu formularza
   * @param formData dane z formularza
   * @param addNext czy po zapisie resetujemy formularz
   */
  const onSubmit = async (formData: ProductFormData, addNext: boolean) => {
    // Stworzenie instancji Product (klasa) na podstawie wypełnionego formularza

    // UWAGA: user podaje stawkę w procentach, np. 23 => to 0.23
    const productTaxRateDecimal = formData.taxRate / 100;

    // Warianty -> mapujemy tak samo
    const mappedVariants = formData.variants.map((v) => {
      const variantTaxRateDec = v.taxRate / 100;
      return {
        id: nanoid(),
        sku: v.sku || nanoid(),
        name: v.name,
        price: { value: v.price, currency: formData.currency },
        priceInclTax: {
          value: v.priceInclTax,
          currency: formData.currency,
        },
        taxRate: variantTaxRateDec,
      };
    });

    const newProduct = Product.fromForm({
      id: nanoid(), // lub w wypadku edycji: istniejące ID
      sku: formData.sku || nanoid(),
      name: formData.name,
      description: formData.description,
      price: { value: formData.price, currency: formData.currency },
      priceInclTax: { value: formData.priceInclTax, currency: formData.currency },
      taxRate: productTaxRateDecimal,
      // atrybuty
      attributes: formData.attributes.map((attr) => ({
        name: attr.attrName,
        type: attr.attrType,
        possibleValues:
          attr.attrType === "select"
            ? attr.attrValues.split(",").map((v) => v.trim()).filter(Boolean)
            : [],
      })),
      // tagi
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((t) => t.length > 0),
      // Warianty
      variants: mappedVariants,
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
      console.error("Submit error", error);
      toast.error("Error saving product: " + String(error));
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Add / Edit Product</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Domyślnie: "Save"
          handleSubmit((data) => onSubmit(data, false))();
        }}
        className="space-y-6"
      >
        {/* Name & Description */}
        <div>
          <label className="block font-medium mb-1">Name</label>
          <Input
            {...register("name", { required: true })}
            placeholder="Product name..."
          />
          {errors.name && (
            <p className="text-red-500 text-sm">Name is required</p>
          )}
        </div>

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
            {...register("sku", { required: true })}
            placeholder="Unique product SKU..."
          />
          {errors.sku && (
            <p className="text-red-500 text-sm">SKU is required</p>
          )}
        </div>

        {/* Price / PriceInclTax / TaxRate / Currency */}
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
              // Gdy user wpisze np. "23", we interpretujemy jako 23%
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1">Currency</label>
            <select {...register("currency")} className="border rounded p-2 w-full">
              {sortedCurrencyList.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Atrybuty */}
        <div>
          <label className="block font-medium mb-2">Attributes</label>
          {attributeFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2">
              <Input
                {...register(`attributes.${index}.attrName`)}
                placeholder="Attribute name"
              />
              <select
                className="border rounded p-2"
                {...register(`attributes.${index}.attrType`)}
              >
                <option value="text">Text</option>
                <option value="select">Select</option>
              </select>
              <Input
                {...register(`attributes.${index}.attrValues`)}
                placeholder="Values (comma-separated)"
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
              appendAttribute({ attrName: "", attrType: "text", attrValues: "" })
            }
          >
            + Add Attribute
          </Button>
        </div>

        {/* Tagi */}
        <div>
          <label className="block font-medium mb-2">Tags (comma separated)</label>
          <Input {...register("tags")} placeholder="e.g. new, sale" />
        </div>

        {/* Warianty */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block font-medium mb-2">Variants</label>
            <Button
              type="button"
              variant="secondary"
              onClick={generateVariantsFromAttributes}
            >
              Generate variants
            </Button>
          </div>

          {/* Lista wariantów */}
          {variantFields.map((field, idx) => {
            const variantPrice = watch(`variants.${idx}.price`);
            const variantPriceInclTax = watch(`variants.${idx}.priceInclTax`);
            const variantTaxRatePercent = watch(`variants.${idx}.taxRate`);

            // lastChangedRef do pętli
            const lastChangedVariantField = useRef<"price" | "priceInclTax" | null>(null);

            // Gdy user zmienia price => recalc priceInclTax
            const onChangeVariantPrice = useCallback(() => {
              lastChangedVariantField.current = "price";
            }, []);

            const onChangeVariantPriceInclTax = useCallback(() => {
              lastChangedVariantField.current = "priceInclTax";
            }, []);

            useEffect(() => {
              if (lastChangedVariantField.current === "price") {
                const decimal = variantTaxRatePercent / 100;
                const newPIT = variantPrice * (1 + decimal);
                updateVariantFormField(idx, {
                  ...field,
                  price: variantPrice,
                  priceInclTax: parseFloat(newPIT.toFixed(2)),
                  taxRate: variantTaxRatePercent,
                });
              }
              // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [variantPrice]);

            useEffect(() => {
              if (lastChangedVariantField.current === "priceInclTax") {
                const decimal = variantTaxRatePercent / 100;
                const newPrice = variantPriceInclTax / (1 + decimal);
                updateVariantFormField(idx, {
                  ...field,
                  price: parseFloat(newPrice.toFixed(2)),
                  priceInclTax: variantPriceInclTax,
                  taxRate: variantTaxRatePercent,
                });
              }
              // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [variantPriceInclTax]);

            return (
              <div key={field.id} className="border p-3 rounded mb-2">
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium">Variant Name</label>
                    <Input
                      {...register(`variants.${idx}.name`)}
                      placeholder="Variant Name"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium">SKU</label>
                    <Input {...register(`variants.${idx}.sku`)} placeholder="SKU" />
                  </div>
                </div>

                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium">Price (net)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`variants.${idx}.price`)}
                      onChange={onChangeVariantPrice}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium">Price (incl. tax)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`variants.${idx}.priceInclTax`)}
                      onChange={onChangeVariantPriceInclTax}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium">Tax Rate (%)</label>
                    <Input
                      type="number"
                      step="1"
                      {...register(`variants.${idx}.taxRate`)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removeVariant(idx)}
                >
                  Remove Variant
                </Button>
              </div>
            );
          })}

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
                    size="sm"
                    variant="secondary"
                    onClick={() => onUpload(f)}
                  >
                    Retry
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => removeFileFromQueue(f.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Przyciski */}
        <div className="flex gap-4 mt-6">
          <Button type="submit" variant="default">
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              // Save & Add Next
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
