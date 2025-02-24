"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDebounce } from "use-debounce";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select"; // ewentualny select do statusu
import { Card } from "@/components/ui/card";

import { getErrorMessage } from "@/lib/utils";
import { OrderApiClient } from "@/data/client/order-api-client";
import { OrderDTO } from "@/data/dto";
import { Order, OrderItem, Note, StatusChange, Address, Product } from "@/data/client/models";
import { ProductApiClient } from "@/data/client/product-api-client";

// Kontekst
import { useOrderContext } from "@/contexts/order-context";

// 1) Zod schema (formularz):
// Uproszczony, ale zawiera kluczowe pola
const orderFormSchema = z.object({
  id: z.string().optional(),

  // addresses:
  billingAddress: z.object({
    address1: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  shippingAddress: z.object({
    address1: z.string().optional(),
    city: z.string().optional(),
  }).optional(),

  // status + statusChanges
  status: z.string().optional(),
  statusChanges: z.array(z.object({
    date: z.string(),
    message: z.string().optional(),
    oldStatus: z.string().optional(),
    newStatus: z.string(),
  })).optional(),

  // notes
  notes: z.array(z.object({
    date: z.string(),
    message: z.string(),
    author: z.string().optional(),
  })).optional(),

  deliveryMethod: z.string().optional(),

  // shipping
  shippingPrice: z.number().optional(),
  shippingPriceInclTax: z.number().optional(),

  // items
  items: z.array(z.object({
    id: z.string(),
    productSkuOrName: z.string().optional(),
    variantId: z.string().optional(),
    quantity: z.number().min(1).default(1),
    // Dwustronna aktualizacja
    price: z.number().min(0).default(0),
    priceInclTax: z.number().min(0).default(0),
    taxRate: z.number().min(0).max(100).default(23),
  })).default([]),
});

// 2) Typ
type OrderFormData = z.infer<typeof orderFormSchema>;


export default function OrderFormPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();

  // Lista statusów:
const ORDER_STATUSES = ["Shopping cart", "New", "Processing", "Shipped", "Completed", "Cancelled"];

  const orderContext = useOrderContext();
  const productApi = new ProductApiClient("");

  // react-hook-form
  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      items: [],
      notes: [],
      statusChanges: [],
      shippingPrice: 0,
      shippingPriceInclTax: 0,
    },
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = methods;

  // FieldArray do items
  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items",
  });
  // FieldArray do notes
  const { fields: noteFields, append: appendNote, remove: removeNote } = useFieldArray({
    control,
    name: "notes",
  });

  // FieldArray do statusChanges, jeśli chcesz także UI do dodawania/usuwać
  // ... analogicznie

  // Stan do przechowywania "wariantów" dla linii
  const [lineVariants, setLineVariants] = useState<Record<number, Product["variants"]>>({});

  // Debounce do obsługi SKU/nazwy:
  const itemsValue = watch("items");
  const [debouncedItems] = useDebounce(itemsValue, 400);

  // Gdy user wpisze SKU/nazwę => wyszukujemy product
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  useEffect(() => {
    if (searchingIndex === null) return;
    const item = debouncedItems[searchingIndex];
    if (!item) return;
    const query = item.productSkuOrName?.trim();
    if (!query) return;

    (async () => {
      try {
        const found = await productApi.search(query);
        if (found.length === 0) {
          // no product
          toast.error(t("No product found for ") + query);
          setLineVariants(prev => {
            const c = { ...prev };
            delete c[searchingIndex];
            return c;
          });
          return;
        }
        // Bierzemy 1-szy
        const p = Product.fromDTO(found[0]);
        if (p.variants && p.variants.length > 0) {
          setLineVariants(prev => ({
            ...prev,
            [searchingIndex]: p.variants,
          }));
        } else {
          // brak wariantów => usuń
          setLineVariants(prev => {
            const c = { ...prev };
            delete c[searchingIndex];
            return c;
          });
          // od razu uzupełnij cenę
          setValue(`items.${searchingIndex}.price`, p.price.value);
          setValue(`items.${searchingIndex}.priceInclTax`, p.priceInclTax?.value || 0);
        }
      } catch (error) {
        console.error(error);
        toast.error(getErrorMessage(error));
      }
    })();
  }, [debouncedItems, searchingIndex]);

  // Po wybraniu wariantu:
  const handleVariantSelect = (lineIndex: number, variantId: string) => {
    setValue(`items.${lineIndex}.variantId`, variantId);
    const variant = lineVariants[lineIndex]?.find(v => v.id === variantId);
    if (variant) {
      setValue(`items.${lineIndex}.price`, variant.price.value);
      setValue(`items.${lineIndex}.priceInclTax`, variant.priceInclTax?.value || 0);
      setValue(`items.${lineIndex}.taxRate`, (variant.taxRate || 0)*100);
    }
  };

  // Dwustronne aktualizacje cen w itemach (net/brutto) + stawka vat
  // Słuchamy watch("items") i jeśli user zmieni price => oblicz priceInclTax, i odwrotnie
  // lub w onChange
  const handleItemPriceChange = (index: number, field: "price" | "priceInclTax") => {
    const item = watch(`items.${index}`);
    // item.taxRate => 0-100
    const r = (item.taxRate ?? 23) / 100;
    if (field === "price") {
      // priceInclTax = price * (1 + r)
      const incl = item.price * (1 + r);
      setValue(`items.${index}.priceInclTax`, parseFloat(incl.toFixed(2)));
    } else {
      // price = priceInclTax / (1 + r)
      const net = item.priceInclTax / (1 + r);
      setValue(`items.${index}.price`, parseFloat(net.toFixed(2)));
    }
  };
  const handleItemTaxRateChange = (index: number) => {
    // Recount net/brutto
    const item = watch(`items.${index}`);
    const r = (item.taxRate ?? 23)/100;
    // liczymy na podstawie price => priceInclTax
    const incl = item.price * (1 + r);
    setValue(`items.${index}.priceInclTax`, parseFloat(incl.toFixed(2)));
  };

  // Dwustronna aktualizacja shipping price
  const shippingPrice = watch("shippingPrice");
  const shippingPriceInclTax = watch("shippingPriceInclTax");
  const shippingTaxRate = 0.23; // przykładowo 23% stawka
  const [lastChangedShippingField, setLastChangedShippingField] = useState<"net"|"gross"|null>(null);
  useEffect(() => {
    if (lastChangedShippingField === "net") {
      const gross = (shippingPrice || 0) * (1 + shippingTaxRate);
      setValue("shippingPriceInclTax", parseFloat(gross.toFixed(2)));
    }
  }, [shippingPrice]);
  useEffect(() => {
    if (lastChangedShippingField === "gross") {
      const net = (shippingPriceInclTax || 0) / (1 + shippingTaxRate);
      setValue("shippingPrice", parseFloat(net.toFixed(2)));
    }
  }, [shippingPriceInclTax]);

  // Zliczanie totals na bieżąco:
  // Niech w useEffect lub w handleSubmit finalnym
  // Lepiej w handleSubmit finalnym = bo i tak serwer to przeliczy.
  // Ale jeśli chcesz UI "na żywo", możesz zrobić:
  const [subTotal, setSubTotal] = useState<Price>({ value: 0, currency: "USD" });
  const [total, setTotal] = useState<Price>({ value: 0, currency: "USD" });
  useEffect(() => {
    // oblicz sumy na bieżąco => lub zrobisz order.calcTotals()
    const formOrder = formDataToOrder(methods.getValues());
    formOrder.calcTotals(); 
    setSubTotal(formOrder.subtotal || { value: 0, currency: "USD" });
    setTotal(formOrder.total || { value: 0, currency: "USD" });
  }, [itemsValue, shippingPrice, shippingPriceInclTax]);

  // Ładowanie istniejącego zamówienia (edycja)
  useEffect(() => {
    if (params?.orderId && params.orderId !== "new") {
      loadOrder(params.orderId);
    }
  }, [params?.orderId]);

  // Funkcja do wczytania z kontekstu
  const loadOrder = async (orderId: string) => {
    try {
      const o = await orderContext.loadOrder(orderId);
      if (!o) {
        toast.error(t("Order not found"));
        return;
      }
      const formData = mapOrderToFormData(o);
      reset(formData);
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    }
  };

  // mapujemy Order -> OrderFormData
  const mapOrderToFormData = (o: Order): OrderFormData => {
    return {
      id: o.id,
      billingAddress: o.billingAddress ? {
        address1: o.billingAddress.address1,
        city: o.billingAddress.city,
        // ...
      } : undefined,
      shippingAddress: o.shippingAddress ? {
        address1: o.shippingAddress.address1,
        city: o.shippingAddress.city,
      } : undefined,
      status: o.status,
      statusChanges: o.statusChanges || [],
      notes: o.notes || [],
      deliveryMethod: o.deliveryMethod,
      shippingPrice: o.shippingPrice?.value || 0,
      shippingPriceInclTax: o.shippingPriceInclTax?.value || 0,
      items: (o.items || []).map((it) => ({
        id: it.id,
        productSkuOrName: "", // do wypełnienia jeśli przechowujesz w DB
        variantId: it.variantId,
        quantity: it.quantity,
        price: it.price?.value || 0,
        priceInclTax: it.priceInclTax?.value || 0,
        taxRate: (it.taxRate||0)*100,
      })),
    };
  };

  // Konwersja form -> model
  const formDataToOrder = (data: OrderFormData): Order => {
    // Składasz DTO i tworzysz Order
    const dto: OrderDTO = {
      id: data.id,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      status: data.status,
      statusChanges: data.statusChanges,
      notes: data.notes,
      deliveryMethod: data.deliveryMethod,
      shippingPrice: { value: data.shippingPrice || 0, currency: "USD" },
      shippingPriceInclTax: { value: data.shippingPriceInclTax || 0, currency: "USD" },
      items: data.items.map((it) => ({
        id: it.id,
        variantId: it.variantId,
        quantity: it.quantity,
        price: { value: it.price, currency: "USD" },
        priceInclTax: { value: it.priceInclTax, currency: "USD" },
        taxRate: (it.taxRate||0)/100,
      })),
      // w modelu calcTotals zsumuje
    };
    return Order.fromDTO(dto);
  };

  // Ostateczny submit
  const onSubmit = async (data: OrderFormData) => {
    try {
      let order = formDataToOrder(data);

      // calcTotals() po stronie klienta
      order.calcTotals();

      // Sprawdzamy czy status się zmienił -> dodajemy statusChanges
      // np. stara wartość w useRef, itp. (pomijam implementację)

      // wysyłamy do kontekstu
      const saved = await orderContext.updateOrder(order, true);

      toast.success(t("Order saved"));
      // redirect
      router.push(`/admin/orders`);
    } catch (error) {
      console.error(error);
      toast.error(t("Error saving order: ") + getErrorMessage(error));
    }
  };

  // Dodanie notatki
  const addNote = () => {
    appendNote({
      date: new Date().toISOString(),
      message: "",
      author: "Admin", // np. z contextu
    });
  };

  // UI
  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          {params?.orderId && params.orderId !== "new" ? t("Edit Order") : t("New Order")}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }}
          className="space-y-4"
        >
          {/* STATUS */}
          <div>
            <label className="block font-medium mb-1">{t("Status")}</label>
            <select {...register("status")} className="border p-2 rounded">
              <option value="">{t("Pick status")}</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* ADRESY */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block font-medium mb-1">{t("Billing Address")}</label>
              <Input {...register("billingAddress.address1")} placeholder={t("Address line 1")} />
              <Input {...register("billingAddress.city")} placeholder={t("City")} />
              {/* ... etc. */}
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">{t("Shipping Address")}</label>
              <Input {...register("shippingAddress.address1")} placeholder={t("Address line 1")} />
              <Input {...register("shippingAddress.city")} placeholder={t("City")} />
            </div>
          </div>

          {/* Dostawa */}
          <div>
            <label className="block font-medium mb-1">{t("Delivery Method")}</label>
            <Input {...register("deliveryMethod")} placeholder={t("e.g. 'DHL'")} />
          </div>
          <div className="flex space-x-2">
            <div>
              <label className="block font-medium mb-1">{t("Shipping Price (net)")}</label>
              <Input
                type="number"
                step="0.01"
                {...register("shippingPrice", { valueAsNumber: true })}
                onFocus={() => setLastChangedShippingField("net")}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">{t("Shipping Price (incl.tax)")}</label>
              <Input
                type="number"
                step="0.01"
                {...register("shippingPriceInclTax", { valueAsNumber: true })}
                onFocus={() => setLastChangedShippingField("gross")}
              />
            </div>
          </div>

          {/* NOTATKI */}
          <div>
            <label className="block font-medium mb-1">{t("Notes")}</label>
            {noteFields.map((nf, idx) => {
              const noteError = errors.notes?.[idx];
              return (
                <div key={nf.id} className="border p-2 mb-2 relative">
                  <Textarea
                    {...register(`notes.${idx}.message`)}
                    rows={2}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeNote(idx)}
                    className="absolute top-1 right-1"
                  >
                    {t("Remove")}
                  </Button>
                  {noteError?.message && (
                    <p className="text-red-500 text-sm">{noteError.message as string}</p>
                  )}
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                appendNote({
                  date: new Date().toISOString(),
                  message: "",
                  author: "Admin",
                });
              }}
            >
              {t("Add note")}
            </Button>
          </div>

          {/* LINES */}
          <div>
            <label className="block font-medium mb-1">{t("Order Items")}</label>
            {itemFields.map((field, idx) => {
              const line = watch(`items.${idx}`);
              const itemErr = errors.items?.[idx];
              const variants = lineVariants[idx] || [];

              return (
                <Card key={field.id} className="p-2 mb-2">
                  {/* SKU / nazwa */}
                  <Input
                    placeholder={t("SKU or product name")}
                    value={line.productSkuOrName || ""}
                    onChange={(e) => {
                      setValue(`items.${idx}.productSkuOrName`, e.target.value);
                      setSearchingIndex(idx);
                    }}
                  />
                  {itemErr?.productSkuOrName && (
                    <p className="text-red-500 text-sm">{itemErr.productSkuOrName.message}</p>
                  )}

                  {/* combobox do wariantów */}
                  {variants.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium">{t("Variant")}</label>
                      <select
                        {...register(`items.${idx}.variantId`)}
                        value={line.variantId || ""}
                        onChange={(e) => handleVariantSelect(idx, e.target.value)}
                      >
                        <option value="">{t("Select a variant")}</option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* quantity + price + priceInclTax + vat */}
                  <div className="flex space-x-2 mt-2">
                    <div>
                      <label className="block text-sm font-medium">{t("Quantity")}</label>
                      <Input
                        type="number"
                        {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                        className="w-24"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">{t("Price (net)")}</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${idx}.price`, { valueAsNumber: true })}
                        className="w-24"
                        onFocus={() => {
                          // user edytuje net
                        }}
                        onChange={() => handleItemPriceChange(idx, "price")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">{t("Price (incl.tax)")}</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${idx}.priceInclTax`, { valueAsNumber: true })}
                        className="w-24"
                        onFocus={() => {
                          // user edytuje brutto
                        }}
                        onChange={() => handleItemPriceChange(idx, "priceInclTax")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">{t("Tax Rate (%)")}</label>
                      <Input
                        type="number"
                        step="1"
                        {...register(`items.${idx}.taxRate`, { valueAsNumber: true })}
                        className="w-16"
                        onChange={() => handleItemTaxRateChange(idx)}
                      />
                    </div>
                  </div>

                  {/* remove line */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => removeItem(idx)}
                  >
                    {t("Remove line")}
                  </Button>
                </Card>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                appendItem({
                  id: crypto.randomUUID(),
                  productSkuOrName: "",
                  variantId: "",
                  quantity: 1,
                  price: 0,
                  priceInclTax: 0,
                  taxRate: 23,
                });
              }}
            >
              {t("Add line")}
            </Button>
          </div>

          {/* Podsumowanie na dole (na bieżąco) */}
          <div className="border p-2 mt-4">
            <div>
              <strong>{t("Subtotal")}:</strong> {subTotal.value.toFixed(2)} {subTotal.currency}
            </div>
            <div>
              <strong>{t("Total")}:</strong> {total.value.toFixed(2)} {total.currency}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-6">
            <Button type="submit" variant="default">
              {t("Save")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                handleSubmit(async (data) => {
                  await onSubmit(data);
                  // i ewentualnie reset do nowego
                  reset();
                })();
              }}
            >
              {t("Save and add next")}
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}