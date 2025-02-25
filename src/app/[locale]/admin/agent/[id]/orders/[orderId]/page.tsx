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
import { defaultOrderId, Order, ORDER_STATUSES, Product, StatusChange } from "@/data/client/models";
import { ProductApiClient } from "@/data/client/product-api-client";
import { v4 as uuidv4 } from "uuid";
import { useDebounce } from "use-debounce";
import { BoxIcon, CopyIcon, DatabaseIcon, FileIcon, ListEnd, ListIcon, MoveLeftIcon, PlusSquareIcon, PointerIcon, RefreshCwIcon, TextIcon, TimerIcon, TrashIcon } from "lucide-react";
import { useAgentContext } from "@/contexts/agent-context";
import { DatabaseContext } from "@/contexts/db-context";
import { SaaSContext } from "@/contexts/saas-context";
import { Price } from "@/components/price";
import { nanoid } from "nanoid";
import DataLoader from "@/components/data-loader";

// 1) Zod schema z wymaganiami
// Dodajemy orderNumber, shippingPriceTaxRate, 
// Adresy: name, postalCode => required
const orderFormSchema = z.object({
  id:  z.string().describe("Unique user-editable order number"),
  email: z.string().email().describe("Order e-mail"),

  billingAddress: z.object({
    name: z.string().min(1, "Name is required"),
    address1: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().min(1, "Postal code is required"),
    phone: z.string().optional(),
  }),
  shippingAddress: z.object({
    name: z.string().min(1, "Name is required"),
    address1: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    postalCode: z.string().min(1, "Postal code is required"),
  }),

  status: z.string().optional(),
  notes: z.array(z.object({
    date: z.string(),
    message: z.string(),
    author: z.string().optional(),
  })).optional(),

  // shipping
  shippingMethod: z.string().optional(),
  shippingPrice: z.number().default(0),
  shippingPriceInclTax: z.number().default(0),
  shippingPriceTaxRate: z.number().min(0).max(100).default(23),  // nowy klucz

  items: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    productSku: z.string().optional(),
    variantSku: z.string().optional(),
    variantName: z.string().optional(),
    productId: z.string().optional(),
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


  const currentStatus = watch('status');
  useEffect(() => {
    let lastStatus = null
    if (statusChanges.length > 0) {
      lastStatus = statusChanges[statusChanges.length - 1].newStatus;
    }
    if (currentStatus && lastStatus && lastStatus !== currentStatus) {
      statusChanges.push({
        date: new Date().toISOString(),
        message: '',
        oldStatus: lastStatus,
        newStatus: currentStatus || "shopping_cart",
      });
    }
  }, [currentStatus]);

  useEffect(() => {
    if (params.orderId === "new") {
      setValue("status", "shopping_cart"); 
    }
  }, [params.orderId, setValue]);  

  // 2) Domyślny orderNumber dla nowych zamówień
  // ORD-{YYYY}-{MM}-{DD}-{3 random letters}
  useEffect(() => {
    if (params.orderId === "new") {
      setValue("id", defaultOrderId());
    }
  }, [params.orderId, setValue]);

  // 3) Ładowanie zamówienia (edycja)
  useEffect(() => {
    if (params?.orderId && params.orderId !== "new") {
      loadOrder(params.orderId as string);
    }
  }, [params?.orderId]);

  const loadOrder = async (orderId: string) => {
    try {
      const o = await orderContext.loadOrder(orderId);
      if (!o) {
        toast.error(t("Order not found"));
        return;
      }
      setStatusChanges(o.statusChanges || []);
      const formData = mapOrderToFormData(o);
      reset(formData);
    } catch (err) {
      console.error(err);
      toast.error("Error loading order: " + getErrorMessage(err));
    }
  };

  const mapOrderToFormData = (o: Order): OrderFormData => {
    return {
      id: o.id || '',
      email: o.email || '',
      billingAddress: {
        name: o.billingAddress?.name || "",
        address1: o.billingAddress?.address1,
        city: o.billingAddress?.city,
        phone: o.billingAddress?.phone || "",
        postalCode: o.billingAddress?.postalCode || "",
      },
      shippingAddress: {
        name: o.shippingAddress?.name || "",
        address1: o.shippingAddress?.address1,
        city: o.shippingAddress?.city,
        phone: o.shippingAddress?.phone,
        postalCode: o.shippingAddress?.postalCode || "",
      },
      status: o.status,
      notes: o.notes || [],
      shippingMethod: o.shippingMethod,
      shippingPrice: o.shippingPrice?.value || 0,
      shippingPriceInclTax: o.shippingPriceInclTax?.value || 0,
      shippingPriceTaxRate: (o.shippingPriceTaxRate || 0)*100, // zakładamy w modelu 0-1
      items: (o.items || []).map((it) => ({
        id: it.id,
        name: it.name,
        productSku: it.productSku,
        productId: it.productId,
        variantSku: it.variantSku,
        variantName: it.variantName,
        variantId: it.variantId || "",
        quantity: it.quantity,
        price: it.price?.value || 0,
        priceInclTax: it.priceInclTax?.value || 0,
        taxRate: (it.taxRate || 0)*100,
      })),
    };
  };

  const formState = watch();
  // 4) Dwustronne shipping net/brutto z shippingPriceTaxRate
  const shippingPrice = watch("shippingPrice");
  const shippingPriceInclTax = watch("shippingPriceInclTax");
  const shippingPriceTaxRate = watch("shippingPriceTaxRate");
  const [lastChangedShippingField, setLastChangedShippingField] = useState<"net" | "gross" | null>(null);

  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([]);

  useEffect(() => {
    if (shippingPriceTaxRate < 0 )
      setValue('shippingPriceTaxRate', 0);

    if (shippingPrice >=0) {
      if (!shippingPriceTaxRate) return;
      const r = shippingPriceTaxRate / 100;
      if (lastChangedShippingField === "net") {
        const gross = shippingPrice * (1 + r);
        setValue("shippingPriceInclTax", parseFloat(gross.toFixed(2)));
      }
    } else {
      setValue("shippingPrice", 0);
    }
  }, [shippingPrice, shippingPriceTaxRate]);

  useEffect(() => {
    if (shippingPriceTaxRate < 0 )
      setValue('shippingPriceTaxRate', 0);

    if (shippingPriceInclTax >=0) {
      if (!shippingPriceTaxRate) return;
      const r = shippingPriceTaxRate / 100;
      if (lastChangedShippingField === "gross") {
        const net = shippingPriceInclTax / (1 + r);
        setValue("shippingPrice", parseFloat(net.toFixed(2)));
      }
    } else {
      setValue("shippingPriceInclTax", 0);
    }
  }, [shippingPriceInclTax, shippingPriceTaxRate]);

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
  const [currentSearchQuery, setCurrentSearchQuery] = useState(""); 
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useDebounce(currentSearchQuery, 400);

  const [totalsRefreshSync, setTotalsRefreshSync] = useState("");

  useEffect(() => {
    if (searchingLineIndex === null) return;
    const line = itemsValue[searchingLineIndex];
    if (!line) return;

    const query = line.name?.trim();
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

        if (response.rows.length === 1) {
          const p = Product.fromDTO(response.rows[0]);
          setValue(`items.${searchingLineIndex}.productSku`, p.sku);
          setValue(`items.${searchingLineIndex}.productId`, p.id);
          setValue(`items.${searchingLineIndex}.name`, p.name);

          setValue(`items.${searchingLineIndex}.price`, p.price.value);
          setValue(`items.${searchingLineIndex}.priceInclTax`, p.priceInclTax?.value || 0);
          setValue(`items.${searchingLineIndex}.taxRate`, (p.taxRate || 0) * 100);

          if(p.variants && p.variants.length > 0) {
            const firstVariant = p.variants[0];
            setValue(`items.${searchingLineIndex}.price`, firstVariant.price.value);
            setValue(`items.${searchingLineIndex}.priceInclTax`, firstVariant.priceInclTax?.value || 0);
            setValue(`items.${searchingLineIndex}.taxRate`, (firstVariant.taxRate || 0) * 100);
            setValue(`items.${searchingLineIndex}.variantId`, firstVariant.id);
            setValue(`items.${searchingLineIndex}.variantSku`, firstVariant.sku);
            setValue(`items.${searchingLineIndex}.variantName`, firstVariant.name);
          }


          setLineVariants(prev => ({ ...prev, [searchingLineIndex]: p.variants }));          
          setTotalsRefreshSync(nanoid()) 

          return;
        }

        setFoundProducts(prev => ({ ...prev, [searchingLineIndex]: response.rows.map(Product.fromDTO) }));
        setTotalsRefreshSync(nanoid());
      } catch (error) {
        console.error(error);
        toast.error("Error querying product: " + getErrorMessage(error));
      }
    })();
  }, [debouncedSearchQuery]);

  // Dwustronna net/brutto w items
  const handleItemPriceChange = (index: number, newValue: number, field: "price" | "priceInclTax") => {
    const item = watch(`items.${index}`);
    const r = (item.taxRate || 23) / 100;
    if (field === "price") {
      if (newValue >= 0) {
        const incl = newValue  * (1 + r);
        setValue(`items.${index}.priceInclTax`, parseFloat(incl.toFixed(2)));
      } else {
        setValue(`items.${index}.price`, 0);
      }
    } else {
      if(newValue >= 0) {
        const net = newValue / (1 + r);
        setValue(`items.${index}.price`, parseFloat(net.toFixed(2)));
      } else { 
        setValue(`items.${index}.priceInclTax`, 0);
      }
    }
    setTotalsRefreshSync(nanoid());
  };
  const handleItemTaxRateChange = (index: number, newValue: number) => {
    if (newValue >= 0) {
      const item = watch(`items.${index}`);
      const r = (newValue || 0)/100;
      const incl = item.price * (1 + r);
      setValue(`items.${index}.priceInclTax`, parseFloat(incl.toFixed(2)));
      setTotalsRefreshSync(nanoid());
    } else {
      setValue(`items.${index}.taxRate`, 0);
    }
  };

  // 6) Podsumowanie
  // Bieżące sumy
  const [subTotal, setSubTotal] = useState({ value: 0, currency: "USD" });
  const [subTotalInclTax, setSubTotalInclTax] = useState({ value: 0, currency: "USD" });

  const [total, setTotal] = useState({ value: 0, currency: "USD" });
  const [totalInclTax, setTotalInclTax] = useState({ value: 0, currency: "USD" });


  const updateTotals = () => {
    const formOrder = formDataToOrder(methods.getValues());
    formOrder.calcTotals(); // liczy shipping, line items
    setSubTotal(formOrder.subtotal || { value: 0, currency: "USD" });
    setTotal(formOrder.total || { value: 0, currency: "USD" });
    setSubTotalInclTax(formOrder.subTotalInclTax || { value: 0, currency: "USD" });
    setTotalInclTax(formOrder.totalInclTax || { value: 0, currency: "USD" });
  }

  useEffect(() => {
    updateTotals();
  }, [
    itemsValue,
    totalsRefreshSync,
    watch("shippingPrice"),
    watch("shippingPriceInclTax"),
    watch("shippingPriceTaxRate"),
  ]);

  // Konwersja FormData -> Order
  const formDataToOrder = (data: OrderFormData): Order => {
    // Uzupełniamy shippingPriceTaxRate, items
    const dto: OrderDTO = {
      id: data.id,
      agentId: agentContext.current?.id || "",
      email: data.email,
      orderNumber: data.id,
      billingAddress: {
        ...data.billingAddress,
      },
      shippingAddress: {
        ...data.shippingAddress,
      },
      status: data.status,
      statusChanges: statusChanges,
      notes: data.notes,
      shippingMethod: data.shippingMethod,
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
        name: li.name || "",
        productSku: li.productSku || "",
        variantName: li.variantName,
        variantSku: li.variantSku || "",
        variantId: li.variantId,
        productId: li.productId,
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
        <Button className="mb-6" size="sm" variant="outline" onClick={() => history.back()}><MoveLeftIcon /> {t('Back to orders')}</Button>

        {orderContext.loaderStatus === 'loading' ? (
          
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <DataLoader />
          </div>
        
        ) : (null) }
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit)();
        }} className="space-y-4">

          {/* ORDER NUMBER */}
          <div>
            <label className="block font-medium mb-1">{t("Order Number")}</label>
            <Input {...register("id")} />
            {errors.id && (
              <p className="text-red-500 text-sm">
                {errors.id?.message as string}
              </p>
            )}
          </div>

          {/* ORDER E-mail */}
          <div>
            <label className="block font-medium mb-1">{t("Order e-mail")}</label>
            <Input {...register("email")} />
            {errors.email && (
              <p className="text-red-500 text-sm">
                {errors.email?.message as string}
              </p>
            )}
          </div>          

          {/* BILLING / SHIPPING */}
          <div className="flex space-x-4">
            <div className="flex-1 border p-2">
              <h3 className="font-semibold mb-2">{t("Billing Address")}

              <Button variant="secondary" title={t("Copy from shipping")} size="sm" onClick={(e) => {
                  e.preventDefault();
                  setValue("billingAddress", methods.getValues("shippingAddress"));
                }}>
                    <CopyIcon className="w-4 h-4" />
                </Button>                
              </h3>
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

            <label className="block text-sm">{t("Phone")}</label>
              <Input {...register("billingAddress.phone")} />
              {errors.billingAddress?.phone && (
                <p className="text-red-500 text-sm">y
                  {errors.billingAddress.phone.message as string}
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
            <label className="block text-sm">{t("Phone")}</label>
              <Input {...register("shippingAddress.phone")} />
              {errors.shippingAddress?.phone && (
                <p className="text-red-500 text-sm">y
                  {errors.shippingAddress.phone.message as string}
                </p>
              )}       

              {/* city, address1, etc. */}
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
                  autoFocus
                    placeholder={t("SKU or product name")}
                    value={line.name || ""}
                    onChange={(e) => {
                      setValue(`items.${idx}.name`, e.target.value);
                      setSearchingLineIndex(idx);
                      setCurrentSearchQuery(e.target.value);
                    }}
                  />

                  {lineErr?.name && (
                    <p className="text-red-500 text-sm">{lineErr.name.message}</p>
                  )}

                  {idx !== null && foundProducts[idx] ? (

                    <div className="flex-row mt-2 text-xs border">
                      <div className="w-full mb-2 border-b p-2">{t('Select product: ')}</div>
                      <div className="w-full">
                        {foundProducts[idx].map(p=>Product.fromDTO(p)).map((p) => (
                          <div  key={p.id} className="grid grid-cols-4 w-full place-items-stretch">
                            <div className="items-left text-left col-span-2 p-2">{p.sku}: {p.name}</div>
                            <div className="p-2"><Price currency={p.priceInclTax?.currency || ''} price={p.priceInclTax?.value || 0} /></div>
                            <div className="items-center align-middle p-2">
                              <Button size="sm" variant={"outline"} onClick={(e) => {
                                
                                e.preventDefault();
                                
                                if (p.variants && p.variants.length > 0) {
                                  setLineVariants(prev => ({
                                    ...prev,
                                    [idx]: p.variants,
                                  }));
                                  setValue(`items.${idx}.variantSku`, p.variants && p.variants.length > 0 ? p.variants[0].sku : "");
                                  setValue(`items.${idx}.variantId`, p.variants && p.variants.length > 0 ? p.variants[0].id : "");
                                  setValue(`items.${idx}.variantName`, p.variants && p.variants.length > 0 ? p.variants[0].name : "");
                                } else {
                                  // brak wariantów => usuń
                                  setLineVariants(prev => {
                                    const c = { ...prev };
                                    delete c[idx];
                                    return c;
                                  });
                                  // można ustawić line.price, line.priceInclTax = p.price, p.priceInclTax
                                  setValue(`items.${idx}.productSku`, p.sku);
                                  setValue(`items.${idx}.price`, p.price.value);
                                  setValue(`items.${idx}.priceInclTax`, p.priceInclTax?.value || 0);
                                  setValue(`items.${idx}.taxRate`, (p.taxRate||0)*100);
                                  setValue(`items.${idx}.variantId`, '');
                                  setValue(`items.${idx}.variantSku`, '');
                                  setValue(`items.${idx}.variantName`, '');
                                }

                                setValue(`items.${idx}.name`, p.name);
                                setValue(`items.${idx}.productSku`, p.sku);
                                setValue(`items.${idx}.productId`, p.id);


                                setFoundProducts(prev => { delete prev[idx]; return prev });                            
                              }}>

                                <PointerIcon className="w-4 h-4 mr-2" />{t('Select')}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  ): null}

                  {line.productSku ? (     
                    <div><span className="text-xs">{t('Product SKU')}</span>: <span className="text-xs ml-2 font-bold">{line.productSku}</span></div>
                  ) : null }

                  {line.variantSku ? (     
                    <div><span className="text-xs">{t('Variant SKU')}</span>: <span className="text-xs ml-2 font-bold">{line.variantSku} / {line.variantName}</span> 
                    {(!variants || variants.length === 0) ? (
                      <Button title={t('Change variant')} size={"sm"} variant={"ghost"} onClick={(e) => {
                        e.preventDefault();
                        setSearchingLineIndex(idx);
                        setCurrentSearchQuery('');
                        setCurrentSearchQuery(line.productSku || "");
                      }}>
                        <TextIcon className="w-4 h-4 mr-2" />
                      </Button>
                    ): null }
                    </div>
                  ) : null }



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
                          setValue(`items.${idx}.variantSku`, foundVar.sku);
                          setValue(`items.${idx}.variantName`, foundVar.name);
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
                        {...register(`items.${idx}.quantity`, { valueAsNumber: true, onChange: (e) => {
                          if (parseFloat(e.target.value) >= 0) {
                            setTotalsRefreshSync(nanoid()) 
                          } else {
                            setValue(`items.${idx}.quantity`, 0);
                          }
                        }})}
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
                        {...register(`items.${idx}.price`, { valueAsNumber: true, onChange: (e) => handleItemPriceChange(idx, parseFloat(e.target.value), "price")})}
                        
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
                        onChange={(e) => handleItemPriceChange(idx, parseFloat(e.target.value), "priceInclTax")}
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
                        onChange={(e) => handleItemTaxRateChange(idx, parseFloat(e.target.value))}
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
              variant="default"
              onClick={() => {
                appendItem({
                  id: uuidv4(),
                  name: "",
                  sku: "",
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

          {/* Delivery method */}
          <div>
            <label className="block font-medium mb-1">{t("Shipping Method")}</label>
            <Input {...register("shippingMethod")} placeholder="e.g. DHL" />
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


          {/* STATUS */}
          <div>
          <label className="block font-medium mb-1">{t("Status")}</label>
          <select
            {...register("status")}
            className="border p-2 rounded text-sm"
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



          { statusChanges && statusChanges.length > 0 ? (
            <div>
              <label className="block font-medium mb-1">{t("Status changes")}</label>
              {statusChanges.map((st) => {
                return (
                  <div key={st.date} className="grid grid-cols-2 border p-2 mb-2 text-sm">
                    <div className="flex"><DatabaseIcon className="w-4 h-4 mr-2"/>{st.newStatus}</div>
                    <div className="flex"><TimerIcon className="w-4 h-4 mr-2"/> {st.date}</div>
                  </div>
                );
              })}
            </div>
          ) : null }


          {/* NOTES */}
          <div>
            <label className="block font-medium mb-1">{t("Notes")}</label>
            {noteFieldsArr.map((nf, idx) => {
              const noteErr = errors.notes?.[idx];
              return (
                <div key={nf.id} className="relative border p-2 mb-2">
                  <Textarea rows={2} {...register(`notes.${idx}.message`)} />
                  <Button
                    className="absolute top-4 right-4"
                    variant="outline"
                    size="sm"
                    onClick={() => removeNoteArr(idx)}
                  >
                    <TrashIcon className="w-4 h-4 " />
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
              <FileIcon className="w-4 h-4 mr-2" /> {t("Add note")}
            </Button>
          </div>


          {/* Podsumowanie */}
          <div className="border p-2 mt-4 text-sm">
            <Button className="mb-2" variant="secondary" onClick={(e)=> {e.preventDefault(); updateTotals() }}>
              <RefreshCwIcon className="w-4 h-4 mr-2"></RefreshCwIcon>{t('Refresh totals')}
            </Button>
            <div className="grid grid-cols-2 p-2">
              <div><strong>{t("Subtotal")}:</strong></div> <div> {subTotal.value.toFixed(2)} {subTotal.currency}</div> 
            </div>
            <div className="grid grid-cols-2 p-2">
              <div><strong>{t("Shipping")}:</strong></div> <div> {shippingPrice.toFixed(2)} {total.currency}</div> 
            </div>
            <div className="grid grid-cols-2 p-2">
              <div><strong>{t("Total")}:</strong></div> <div> {total.value.toFixed(2)} {total.currency}</div> 
            </div>
            <div className="grid grid-cols-2 p-2">
              <div><strong>{t("Subtotal incl. tax.")}:</strong></div> <div> {subTotalInclTax.value.toFixed(2)} {subTotal.currency}</div> 
            </div>
            <div className="grid grid-cols-2 p-2">
              <div><strong>{t("Shipping incl. tax.")}:</strong></div> <div> {shippingPriceInclTax.toFixed(2)} {total.currency}</div> 
            </div>

            <div className="grid grid-cols-2 p-2">
              <div><strong>{t("Total incl. tax.")}:</strong></div><div> {totalInclTax.value.toFixed(2)} {total.currency}</div>
            </div>

          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit" variant="default" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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
