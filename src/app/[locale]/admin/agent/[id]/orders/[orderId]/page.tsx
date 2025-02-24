"use client";

import React, { useEffect, useState, useRef, useContext, use } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { getErrorMessage } from "@/lib/utils";
import { useOrderContext } from "@/contexts/order-context";
import { OrderDTO } from "@/data/dto";
import { Order, Product } from "@/data/client/models";
import { ProductApiClient } from "@/data/client/product-api-client";
import { v4 as uuidv4 } from "uuid";
import { useDebounce } from "use-debounce";
import { BoxIcon, CopyIcon, ListEnd, ListIcon, PlusSquareIcon, TrashIcon } from "lucide-react";
import { useAgentContext } from "@/contexts/agent-context";
import { DatabaseContext } from "@/contexts/db-context";
import { SaaSContext } from "@/contexts/saas-context";

// 1) Zod schema z wymaganiami
// Dodajemy orderNumber, shippingPriceTaxRate, 
// Adresy: name, postalCode => required
const orderFormSchema = z.object({
  id: z.string().optional(),

  // Nowy klucz orderNumber
  orderNumber: z.string().describe("Unique user-editable order number"),

  billingAddress: z.object({
    name: z.string().min(1, "Name is required"),
    address1: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().min(1, "Postal code is required"),
    // dodać resztę pól wedle potrzeb...
  }),
  shippingAddress: z.object({
    name: z.string().min(1, "Name is required"),
    address1: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().min(1, "Postal code is required"),
  }),

  status: z.string().optional(),
  notes: z.array(z.object({
    date: z.string(),
    message: z.string(),
    author: z.string().optional(),
  })).optional(),

  // shipping
  deliveryMethod: z.string().optional(),
  shippingPrice: z.number().default(0),
  shippingPriceInclTax: z.number().default(0),
  shippingPriceTaxRate: z.number().min(0).max(100).default(23),  // nowy klucz

  items: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    sku: z.string().optional(),
    variantId: z.string().optional(),
    quantity: z.number().min(1).default(1),

    price: z.number().min(0).default(0),
    priceInclTax: z.number().min(0).default(0),
    taxRate: z.number().min(0).max(100).default(23),
  })).default([]),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

export default function OrderFormPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const agentContext = useAgentContext();
  const orderContext = useOrderContext();
  const dbContext = useContext(DatabaseContext);
  const saasContext = useContext(SaaSContext);

  // Zamiast poprzednich stałych:
  const ORDER_STATUSES = [
    { label: t("Shopping Cart"), value: "shopping_cart" },
    { label: t("Quote"), value: "quote" },
    { label: t("New"), value: "new" },
    { label: t("Processing"), value: "processing" },
    { label: t("Shipped"), value: "shipped" },
    { label: t("Completed"), value: "completed" },
    { label: t("Cancelled"), value: "cancelled" },
  ];


  const productApi = new ProductApiClient("", dbContext, saasContext);

  // react-hook-form
  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      // defaulty
      billingAddress: { name: "", postalCode: "" },
      shippingAddress: { name: "", postalCode: "" },
      shippingPrice: 0,
      shippingPriceInclTax: 0,
      shippingPriceTaxRate: 23,
      items: [],
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

  // Field arrays do items i notes
  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items",
  });
  const { fields: noteFields, append: appendNote, remove: removeNote } = useFieldArray({
    control,
    name: "notes",
  });

  useEffect(() => {
    if (params.orderId === "new") {
      setValue("status", "shopping_cart"); 
    }
  }, [params.orderId, setValue]);  

  // 2) Domyślny orderNumber dla nowych zamówień
  // ORD-{YYYY}-{MM}-{DD}-{3 random letters}
  useEffect(() => {
    if (params.orderId === "new") {
      const today = new Date();
      const year = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const rand = Math.random().toString(36).substring(2, 5).toUpperCase();

      const defaultOrderNumber = `ORD-${year}-${mm}-${dd}-${rand}`;
      setValue("orderNumber", defaultOrderNumber);
    }
  }, [params.orderId, setValue]);

  // 3) Ładowanie zamówienia (edycja)
  useEffect(() => {
    if (params?.orderId && params.orderId !== "new") {
      loadOrder(params.orderId);
    }
  }, [params?.orderId]);

  const loadOrder = async (orderId: string) => {
    try {
      const o = await orderContext.loadOrder(orderId);
      if (!o) {
        toast.error(t("Order not found"));
        return;
      }
      const formData = mapOrderToFormData(o);
      reset(formData);
    } catch (err) {
      console.error(err);
      toast.error("Error loading order: " + getErrorMessage(err));
    }
  };

  const mapOrderToFormData = (o: Order): OrderFormData => {
    return {
      id: o.id,
      orderNumber: o.orderNumber || "",
      billingAddress: {
        name: o.billingAddress?.name || "",
        address1: o.billingAddress?.address1,
        city: o.billingAddress?.city,
        postalCode: o.billingAddress?.postalCode || "",
      },
      shippingAddress: {
        name: o.shippingAddress?.name || "",
        address1: o.shippingAddress?.address1,
        city: o.shippingAddress?.city,
        postalCode: o.shippingAddress?.postalCode || "",
      },
      status: o.status,
      notes: o.notes || [],
      deliveryMethod: o.deliveryMethod,
      shippingPrice: o.shippingPrice?.value || 0,
      shippingPriceInclTax: o.shippingPriceInclTax?.value || 0,
      shippingPriceTaxRate: (o.shippingPriceTaxRate || 0)*100, // zakładamy w modelu 0-1
      items: (o.items || []).map((it) => ({
        id: it.id,
        productSkuOrName: it.name,
        variantId: it.variantId || "",
        quantity: it.quantity,
        price: it.price?.value || 0,
        priceInclTax: it.priceInclTax?.value || 0,
        taxRate: (it.taxRate || 0)*100,
      })),
    };
  };

  // 4) Dwustronne shipping net/brutto z shippingPriceTaxRate
  const shippingPrice = watch("shippingPrice");
  const shippingPriceInclTax = watch("shippingPriceInclTax");
  const shippingPriceTaxRate = watch("shippingPriceTaxRate");
  const [lastChangedShippingField, setLastChangedShippingField] = useState<"net" | "gross" | null>(null);

  useEffect(() => {
    if (!shippingPriceTaxRate) return;
    const r = shippingPriceTaxRate / 100;
    if (lastChangedShippingField === "net") {
      const gross = shippingPrice * (1 + r);
      setValue("shippingPriceInclTax", parseFloat(gross.toFixed(2)));
    }
  }, [shippingPrice]);

  useEffect(() => {
    if (!shippingPriceTaxRate) return;
    const r = shippingPriceTaxRate / 100;
    if (lastChangedShippingField === "gross") {
      const net = shippingPriceInclTax / (1 + r);
      setValue("shippingPrice", parseFloat(net.toFixed(2)));
    }
  }, [shippingPriceInclTax]);

  // 5) Obsługa items => product / variant
  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({
    control,
    name: "items",
  });

  // Stan do przechowywania wariantów
  const [lineVariants, setLineVariants] = useState<Record<number, Product["variants"]>>({});
  const [foundProducts, setFoundProducts] = useState<Record<number, Product[] | null>>({});

  // Debounce
  const itemsValue = watch("items");

  // Gdy user zmienia productSkuOrName
  const [searchingLineIndex, setSearchingLineIndex] = useState<number | null>(null);
  const [debounceSearchingLineIndex] = useDebounce(searchingLineIndex, 400);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(""); 
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useDebounce(currentSearchQuery, 400);

  useEffect(() => {
    if (searchingLineIndex === null) return;
    const line = itemsValue[searchingLineIndex];
    if (!line) return;

    const query = line.productSkuOrName?.trim();
    if (!query) return;

    // Zamiast search => productApi.query
    (async () => {
      try {
        // Parametry paginacji np. limit=10, offset=0, orderBy, query
        const response = await productApi.query({
          limit: 10,
          offset: 0,
          query: query,
        });
        // response => { rows: ProductDTO[], total, limit, ... } (zgodnie z definicją)
        if (response.rows.length === 0) {
          toast.error(t(`No product found for ${query}`));
          setLineVariants(prev => {
            const c = { ...prev };
            delete c[searchingLineIndex];
            return c;
          });
          return;
        }

        setFoundProducts(prev => ({ ...prev, [searchingLineIndex]: response.rows.map(Product.fromDTO) }));
      } catch (error) {
        console.error(error);
        toast.error("Error querying product: " + getErrorMessage(error));
      }
    })();
  }, [debouncedSearchQuery]);

  // Dwustronna net/brutto w items
  const handleItemPriceChange = (index: number, field: "price" | "priceInclTax") => {
    const item = watch(`items.${index}`);
    const r = (item.taxRate || 23) / 100;
    if (field === "price") {
      const incl = item.price * (1 + r);
      setValue(`items.${index}.priceInclTax`, parseFloat(incl.toFixed(2)));
    } else {
      const net = item.priceInclTax / (1 + r);
      setValue(`items.${index}.price`, parseFloat(net.toFixed(2)));
    }
  };
  const handleItemTaxRateChange = (index: number) => {
    const item = watch(`items.${index}`);
    const r = (item.taxRate || 0)/100;
    const incl = item.price * (1 + r);
    setValue(`items.${index}.priceInclTax`, parseFloat(incl.toFixed(2)));
  };

  // 6) Podsumowanie
  // Bieżące sumy
  const [subTotal, setSubTotal] = useState({ value: 0, currency: "USD" });
  const [total, setTotal] = useState({ value: 0, currency: "USD" });

  useEffect(() => {
    const formOrder = formDataToOrder(methods.getValues());
    formOrder.calcTotals(); // liczy shipping, line items
    setSubTotal(formOrder.subtotal || { value: 0, currency: "USD" });
    setTotal(formOrder.total || { value: 0, currency: "USD" });
  }, [
    itemsValue,
    watch("shippingPrice"),
    watch("shippingPriceInclTax"),
    watch("shippingPriceTaxRate"),
  ]);

  // Konwersja FormData -> Order
  const formDataToOrder = (data: OrderFormData): Order => {
    // Uzupełniamy shippingPriceTaxRate, items
    const dto: OrderDTO = {
      id: data.id,
      orderNumber: data.orderNumber,
      billingAddress: {
        ...data.billingAddress,
      },
      shippingAddress: {
        ...data.shippingAddress,
      },
      status: data.status,
      notes: data.notes,
      deliveryMethod: data.deliveryMethod,
      shippingPrice: {
        value: data.shippingPrice,
        currency: "USD",
      },
      shippingPriceInclTax: {
        value: data.shippingPriceInclTax,
        currency: "USD",
      },
      shippingPriceTaxRate: (data.shippingPriceTaxRate || 0)/100, // w modelu 0-1

      items: data.items.map((li) => ({
        id: li.id,
        name: li.name ||| "",
        sku: li.sku || "",
        variantId: li.variantId,
        quantity: li.quantity,
        price: { value: li.price, currency: "USD" },
        priceInclTax: { value: li.priceInclTax, currency: "USD" },
        taxRate: li.taxRate / 100,
      })),

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return Order.fromDTO(dto);
  };

  // 7) Submit
  const onSubmit = async (data: OrderFormData) => {
    try {
      let order = formDataToOrder(data);
      order.calcTotals(); // kliencka kalkulacja

      const saved = await orderContext.updateOrder(order, true);
      toast.success(t("Order saved!"));
      router.push(`/admin/agent/${agentContext.current?.id}/orders`);
    } catch (error) {
      console.error(error);
      toast.error("Error saving order: " + getErrorMessage(error));
    }
  };

  // Dodawanie/usuwanie notatek
  const { fields: noteFieldsArr, append: appendNoteArr, remove: removeNoteArr } = useFieldArray({
    control,
    name: "notes",
  });
  const addNote = () => {
    appendNoteArr({
      date: new Date().toISOString(),
      message: "",
      author: "Admin",
    });
  };

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          {params?.orderId && params.orderId !== "new" ? t("Edit Order") : t("New Order")}
        </h1>

        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit)();
        }} className="space-y-4">

          {/* ORDER NUMBER */}
          <div>
            <label className="block font-medium mb-1">{t("Order Number")}</label>
            <Input {...register("orderNumber")} />
            {errors.orderNumber && (
              <p className="text-red-500 text-sm">
                {errors.orderNumber.message as string}
              </p>
            )}
          </div>

          {/* BILLING / SHIPPING */}
          <div className="flex space-x-4">
            <div className="flex-1 border p-2">
              <h3 className="font-semibold mb-2">{t("Billing Address")}</h3>
              <label className="block text-sm">{t("Name")}</label>
              <Input {...register("billingAddress.name")} />
              {errors.billingAddress?.name && (
                <p className="text-red-500 text-sm">
                  {errors.billingAddress.name.message as string}
                </p>
              )}

              <label className="block text-sm">{t("Postal Code")}</label>
              <Input {...register("billingAddress.postalCode")} />
              {errors.billingAddress?.postalCode && (
                <p className="text-red-500 text-sm">
                  {errors.billingAddress.postalCode.message as string}
                </p>
              )}

              <label className="block text-sm">{t("City")}</label>
              <Input {...register("billingAddress.city")} />
              {errors.billingAddress?.city && (
                <p className="text-red-500 text-sm">y
                  {errors.billingAddress.city.message as string}
                </p>
              )}

            <label className="block text-sm">{t("Address line 1 (Street etc)")}</label>
              <Input {...register("billingAddress.address1")} />
              {errors.billingAddress?.address1 && (
                <p className="text-red-500 text-sm">y
                  {errors.billingAddress.address1.message as string}
                </p>
              )}
              {/* city, address1, etc. */}
            </div>

            <div className="flex-1 border p-2">
              <h3 className="font-semibold mb-2">{t("Shipping Address")}
                <Button variant="secondary" title={t("Copy from billing")} size="sm" onClick={(e) => {
                  e.preventDefault();
                  setValue("shippingAddress", methods.getValues("billingAddress"));
                }}>
                    <CopyIcon className="w-4 h-4" />
                </Button>

              </h3>
              <label className="block text-sm">{t("Name")}</label>
              <Input {...register("shippingAddress.name")} />
              {errors.shippingAddress?.name && (
                <p className="text-red-500 text-sm">
                  {errors.shippingAddress.name.message as string}
                </p>
              )}

              <label className="block text-sm">{t("Postal Code")}</label>
              <Input {...register("shippingAddress.postalCode")} />
              {errors.shippingAddress?.postalCode && (
                <p className="text-red-500 text-sm">
                  {errors.shippingAddress.postalCode.message as string}
                </p>
              )}

              <label className="block text-sm">{t("City")}</label>
              <Input {...register("shippingAddress.city")} />
              {errors.shippingAddress?.city && (
                <p className="text-red-500 text-sm">
                  {errors.shippingAddress.city.message as string}
                </p>
              )}

            <label className="block text-sm">{t("Address Line 1 (Street etc.) ")}</label>
              <Input {...register("shippingAddress.address1")} />
              {errors.shippingAddress?.address1 && (
                <p className="text-red-500 text-sm">
                  {errors.shippingAddress.address1.message as string}
                </p>
              )}


              {/* city, address1, etc. */}
            </div>
          </div>

          {/* STATUS */}
          <div>
          <label className="block font-medium mb-1">{t("Status")}</label>
          <select
            {...register("status")}
            className="border p-2 rounded"
            // ewentualnie defaultValue="shopping_cart" jeśli nie robisz .default w Zod
          >
            {ORDER_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="text-red-500 text-sm">
              {errors.status.message as string}
            </p>
          )}
        </div>

          {/* NOTES */}
          <div>
            <label className="block font-medium mb-1">{t("Notes")}</label>
            {noteFieldsArr.map((nf, idx) => {
              const noteErr = errors.notes?.[idx];
              return (
                <div key={nf.id} className="relative border p-2 mb-2">
                  <Textarea rows={2} {...register(`notes.${idx}.message`)} />
                  <Button
                    className="absolute top-1 right-1"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeNoteArr(idx)}
                  >
                    {t("Remove")}
                  </Button>
                  {noteErr?.message && (
                    <p className="text-red-500 text-sm">{noteErr.message}</p>
                  )}
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              onClick={addNote}
            >
              {t("Add note")}
            </Button>
          </div>

          {/* Delivery method */}
          <div>
            <label className="block font-medium mb-1">{t("Delivery Method")}</label>
            <Input {...register("deliveryMethod")} placeholder="e.g. DHL" />
          </div>

          {/* Shipping net/brutto/taxRate */}
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
            <div>
              <label className="block font-medium mb-1">{t("Shipping Tax Rate (%)")}</label>
              <Input
                type="number"
                step="1"
                {...register("shippingPriceTaxRate", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block font-medium mb-1">{t("Order Items")}</label>
            {itemFields.map((field, idx) => {
              const line = watch(`items.${idx}`);
              const lineErr = errors.items?.[idx];
              // Warianty
              const variants = lineVariants[idx] || [];

              return (
                <Card key={field.id} className="p-3 mb-2">
                  <Input
                    placeholder={t("SKU or product name")}
                    value={line.productSkuOrName || ""}
                    onChange={(e) => {
                      setValue(`items.${idx}.productSkuOrName`, e.target.value);
                      setSearchingLineIndex(idx);
                      setDebouncedSearchQuery(e.target.value);
                    }}
                  />
                  
                  {lineErr?.productSkuOrName && (
                    <p className="text-red-500 text-sm">{lineErr.productSkuOrName.message}</p>
                  )}

                  {idx !== null && foundProducts[idx] ? (

                    <div className="flex-row mt-2 text-xs">
                      {t('Select product: ')}
                      {foundProducts[idx].map(p=>Product.fromDTO(p)).map((p) => (
                          <Button size="sm" className="m-2" variant={"outline"} onClick={(e) => {
                            
                            e.preventDefault();
                            
                            if (p.variants && p.variants.length > 0) {
                              setLineVariants(prev => ({
                                ...prev,
                                [idx]: p.variants,
                              }));
                            } else {
                              // brak wariantów => usuń
                              setLineVariants(prev => {
                                const c = { ...prev };
                                delete c[idx];
                                return c;
                              });
                              // można ustawić line.price, line.priceInclTax = p.price, p.priceInclTax
                              setValue(`items.${idx}.name`, p.name);
                              setValue(`items.${idx}.sku`, p.sku);
                              setValue(`items.${idx}.price`, p.price.value);
                              setValue(`items.${idx}.priceInclTax`, p.priceInclTax?.value || 0);
                              setValue(`items.${idx}.taxRate`, (p.taxRate||0)*100);
                            }

                            setFoundProducts(prev => { delete prev[idx]; return prev });                            
                          }}>

                            {p.name}
                          </Button>
                      ))}

                    </div>

                  ): null}

                  {idx !== null && foundProduct[idx] ? (
                    <div className="mt-2">
                      <strong>{foundProduct[idx]?.name}</strong>
                      <div className="text-xs">({t('SKU - ')} {foundProduct[idx].sku}) </div>
                    </div>
                  ) : (null)}

                  {/* Combo do wariantów */}
                  {variants.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium">{t("Variant")}</label>
                      <select
                      {...register(`items.${idx}.variantId`)}
                      value={line.variantId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue(`items.${idx}.variantId`, val);
                        const foundVar = variants.find((vv) => vv.id === val);
                        if (foundVar) {
                        setValue(`items.${idx}.price`, foundVar.price.value);
                        setValue(`items.${idx}.priceInclTax`, foundVar.priceInclTax?.value || 0);
                        setValue(`items.${idx}.taxRate`, (foundVar.taxRate || 0) * 100);
                        }
                      }}
                      className="border p-2 rounded text-sm"
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

                  <div className="flex space-x-2 mt-2">
                    {/* quantity */}
                    <div>
                      <label className="block text-sm font-medium">{t("Quantity")}</label>
                      <Input
                        type="number"
                        {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                        className="w-20"
                      />
                      {lineErr?.quantity && <p className="text-red-500 text-sm">{lineErr.quantity.message}</p>}
                    </div>

                    {/* Price net */}
                    <div>
                      <label className="block text-sm font-medium">{t("Price (net)")}</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${idx}.price`, { valueAsNumber: true })}
                        onChange={() => handleItemPriceChange(idx, "price")}
                        className="w-24"
                      />
                      {lineErr?.price && <p className="text-red-500 text-sm">{lineErr.price.message}</p>}
                    </div>

                    {/* Price incl tax */}
                    <div>
                      <label className="block text-sm font-medium">{t("Price (incl. tax)")}</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${idx}.priceInclTax`, { valueAsNumber: true })}
                        onChange={() => handleItemPriceChange(idx, "priceInclTax")}
                        className="w-24"
                      />
                      {lineErr?.priceInclTax && <p className="text-red-500 text-sm">{lineErr.priceInclTax.message}</p>}
                    </div>

                    {/* taxRate */}
                    <div>
                      <label className="block text-sm font-medium">{t("Tax Rate (%)")}</label>
                      <Input
                        type="number"
                        step="1"
                        {...register(`items.${idx}.taxRate`, { valueAsNumber: true })}
                        onChange={() => handleItemTaxRateChange(idx)}
                        className="w-16"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => removeItem(idx)}
                  >
                    <TrashIcon className="w-4 h-4 mr-2"/> {t("Remove line")}
                  </Button>
                </Card>
              );
            })}

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                appendItem({
                  id: uuidv4(),
                  productSkuOrName: "",
                  variantId: "",
                  quantity: 1,
                  price: 0,
                  priceInclTax: 0,
                  taxRate: 23,
                });
              }}
            >
              <ListEnd className="w-4 h-4 mr-2"/> {t("Add line")}
            </Button>
          </div>

          {/* Podsumowanie */}
          <div className="border p-2 mt-4">
            <div>
              <strong>{t("Subtotal")}:</strong> {subTotal.value.toFixed(2)} {subTotal.currency}
            </div>
            <div>
              <strong>{t("Total")}:</strong> {total.value.toFixed(2)} {total.currency}
            </div>
          </div>

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
