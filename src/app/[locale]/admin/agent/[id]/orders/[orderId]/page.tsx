"use client";

import React, { useEffect, useState, useRef, useContext } from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "@/lib/utils";

// Konteksty
import { useOrderContext } from "@/contexts/order-context";
import { useProductContext } from "@/contexts/product-context";

// Model
import { Order } from "@/data/client/models";  // klasa Order z metodą .calcTotals()
import { Product } from "@/data/client/models"; // do mapowania w linii

// API client do szukania produktów
import { ProductApiClient } from "@/data/client/product-api-client";

// Schemat walidacji (z uproszczonymi polami)
const priceSchema = z.object({
  value: z.number().min(0),
  currency: z.string(),
});

const addressSchema = z.object({
  address1: z.string().optional(),
  city: z.string().optional(),
});

const orderLineSchema = z.object({
  id: z.string().optional(),
  // pole textowe do wyszukiwania:
  searchKey: z.string().optional(), // SKU/nazwa
  productId: z.string().optional(),
  productName: z.string().optional(),

  quantity: z.number().min(1).default(1),
  taxRate: z.number().min(0).max(1).default(0.23), // 0.23 => 23%

  // Price
  price: priceSchema.optional(),
  priceInclTax: priceSchema.optional(),
  taxValue: priceSchema.optional(),

  lineValue: priceSchema.optional(),
  lineValueInclTax: priceSchema.optional(),
  lineTaxValue: priceSchema.optional(),
});

const orderFormSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  // np. address
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),

  // Tablica linii
  lines: z.array(orderLineSchema),
  notes: z.string().optional(),

  // Pola cenowe sumaryczne
  subtotal: priceSchema.optional(),
  total: priceSchema.optional(),
});

// Typ formularza:
type OrderFormData = z.infer<typeof orderFormSchema>;

/**
 * Strona dodawania/edycji zamówienia
 */
export default function OrderFormPage() {
  const { t } = useTranslation();
  const orderContext = useOrderContext();
  const productContext = useProductContext(); // do wyszukiwania
  const router = useRouter();
  const params = useParams();

  // Inicjalizacja formularza
  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      lines: [],
    },
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = methods;

  // useFieldArray do dynamicznych linii
  const { fields: lineFields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  // Ładowanie zamówienia do edycji
  useEffect(() => {
    if (params?.orderId && params.orderId !== "new") {
      loadOrder(params.orderId);
    }
  }, [params?.orderId]);

  async function loadOrder(orderId: string) {
    try {
      // wczytujemy z kontekstu
      const loaded = await orderContext.loadOrder(orderId);
      // zamieniamy na formData (opcjonalnie)
      const formData: OrderFormData = orderToFormData(loaded);
      reset(formData);
    } catch (error) {
      toast.error(t("Error loading order: ") + getErrorMessage(error));
    }
  }

  // mapuje Order -> OrderFormData
  function orderToFormData(order: Order): OrderFormData {
    return {
      id: order.id,
      status: order.status,
      billingAddress: order.billingAddress ? {
        address1: order.billingAddress.address1,
        city: order.billingAddress.city,
      } : {},
      shippingAddress: order.shippingAddress ? {
        address1: order.shippingAddress.address1,
        city: order.shippingAddress.city,
      } : {},
      lines: (order.items || []).map((line) => ({
        id: line.id || nanoid(),
        searchKey: line.productName, // w polu text
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        taxRate: line.taxRate || 0,
        price: line.price,
        priceInclTax: line.priceInclTax,
        taxValue: line.taxValue,
        lineValue: line.lineValue,
        lineValueInclTax: line.lineValueInclTax,
        lineTaxValue: line.lineTaxValue,
      })),
      notes: order.notes?.map((n) => n.message).join("\n"), // example
      subtotal: order.subtotal,
      total: order.total,
    };
  }

  // 1) Tworzenie nowego order z formularza
  function formDataToOrder(formData: OrderFormData): Order {
    // Tutaj tworzymy obiekt `Order` (z .fromDTO lub inną logiką).
    const order = new Order({
      id: formData.id || nanoid(),
      status: formData.status || "",
      billingAddress: formData.billingAddress,
      shippingAddress: formData.shippingAddress,
      items: formData.lines.map((line) => ({
        id: line.id || nanoid(),
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        taxRate: line.taxRate,
        price: line.price,
        priceInclTax: line.priceInclTax,
        taxValue: line.taxValue,
        lineValue: line.lineValue,
        lineValueInclTax: line.lineValueInclTax,
        lineTaxValue: line.lineTaxValue,
      })),
      // notes, subtotal, total itp. wypełnimy w calcTotals
    } as any);

    // calcTotals => w modelu Order (po stronie klienckiej)
    order.calcTotals(); // np. lineValue = quantity * price, sum => order.subtotal / total

    return order;
  }

  // 2) Obsługa zapisu
  async function onSubmit(formData: OrderFormData, addNext: boolean) {
    // Tworzymy obiekt i wywołujemy calcTotals
    let newOrder = formDataToOrder(formData);

    try {
      const saved = await orderContext.updateOrder(newOrder, true);
      toast.success(t("Order saved!"));
      if (addNext) {
        router.push("/admin/orders/new");
      } else {
        router.push("/admin/orders");
      }
    } catch (error) {
      console.error(error);
      toast.error(t("Error saving order: ") + getErrorMessage(error));
    }
  }

  // 3) Dodawanie nowej linii
  function addLine() {
    append({
      id: nanoid(),
      searchKey: "",
      productName: "",
      quantity: 1,
      taxRate: 0.23,
      price: { value: 0, currency: "USD" },
      priceInclTax: { value: 0, currency: "USD" },
    });
  }

  // 4) Obsługa wyszukiwania produktu
  // Kiedy user wpisuje "searchKey" => np. onBlur -> pobieramy z API
  async function fetchProductForLine(lineIndex: number, searchKey: string) {
    if (!searchKey) return;
    try {
      // np. query = searchKey => w productContext / productApi
      // lub wprost: 
      const client = new ProductApiClient(""); 
      const response = await client.query({
        limit: 1, 
        offset: 0, 
        orderBy: "createdAt",
        query: searchKey,
      });
      if (response.rows.length > 0) {
        // Mamy pasujący produkt
        const found = Product.fromDTO(response.rows[0]);
        // Uzupełniamy dane linii
        setValue(`lines.${lineIndex}.productId`, found.id || "");
        setValue(`lines.${lineIndex}.productName`, found.name);
        setValue(`lines.${lineIndex}.price.value`, found.price?.value || 0);
        setValue(`lines.${lineIndex}.price.currency`, found.price?.currency || "USD");
        setValue(`lines.${lineIndex}.taxRate`, found.taxRate || 0);
        // itp. => lineValue obliczy się w calcTotals (po submicie)
        toast.success(t("Product found and line updated!"));
      } else {
        toast(t("No product found matching: ") + searchKey);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("Error searching product: ") + getErrorMessage(error));
    }
  }

  // Render
  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">
        {params?.orderId && params.orderId !== "new"
          ? t("Edit Order") + `: ${params.orderId}`
          : t("Add New Order")}
      </h1>

      <FormProvider {...methods}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit((data) => onSubmit(data, false))();
          }}
          className="space-y-6"
        >
          {/* STATUS */}
          <div>
            <label className="block font-medium mb-1">{t("Status")}</label>
            <Input {...register("status")} placeholder={t("e.g. draft / confirmed / shipped")} />
          </div>

          {/* BillingAddress - uproszczone */}
          <div>
            <label className="block font-medium mb-1">{t("Billing Address")}</label>
            <Input {...register("billingAddress.address1")} placeholder={t("Address line 1")} />
            <Input {...register("billingAddress.city")} placeholder={t("City")} />
          </div>

          {/* LINES */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-medium">{t("Order Lines")}</label>
              <Button variant="secondary" onClick={() => addLine()}>
                {t("+ Add line")}
              </Button>
            </div>
            {lineFields.map((field, index) => (
              <div key={field.id} className="border p-3 rounded mb-2 space-y-2">
                <div className="flex gap-2 items-center">
                  {/* Pole searchKey do wpisania SKU/nazwy */}
                  <Input
                    placeholder={t("SKU or name...")}
                    {...register(`lines.${index}.searchKey` as const)}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val) {
                        // wyszukaj produkt i ustaw price
                        fetchProductForLine(index, val);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const val = watch(`lines.${index}.searchKey`);
                      if (val) fetchProductForLine(index, val);
                    }}
                  >
                    {t("Search")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => remove(index)}
                  >
                    {t("Remove")}
                  </Button>
                </div>

                {/* productName */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm">{t("Product Name")}</label>
                    <Input {...register(`lines.${index}.productName` as const)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm">{t("ProductId")}</label>
                    <Input {...register(`lines.${index}.productId` as const)} />
                  </div>
                </div>

                {/* quantity, price, taxRate */}
                <div className="flex gap-2">
                  <div>
                    <label className="text-sm">{t("Quantity")}</label>
                    <Input
                      type="number"
                      {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <label className="text-sm">{t("Price (net)")}</label>
                    <Input
                      type="number"
                      {...register(`lines.${index}.price.value`, { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <label className="text-sm">{t("Tax Rate")}</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.taxRate`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* NOTATKI */}
          <div>
            <label className="block font-medium mb-1">{t("Notes")}</label>
            <Textarea rows={3} {...register("notes")} placeholder={t("Type any notes...")} />
          </div>

          {/* PRZYCISKI */}
          <div className="flex gap-4 mt-6">
            <Button type="submit" variant="default">
              {t("Save")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                handleSubmit((data) => onSubmit(data, true))();
              }}
            >
              {t("Save and add next")}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
