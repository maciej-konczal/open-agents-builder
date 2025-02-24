"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";
import { DatabaseContext } from "./db-context";
import { SaaSContext } from "./saas-context";
import { DataLoadingStatus } from "@/data/client/models"; 
import { Order } from "@/data/client/models"; // klasa modelu (Order.fromDTO, toDTO)
import { OrderApiClient, DeleteOrderResponse, PutOrderResponseSuccess, PutOrderResponseError } from "@/data/client/order-api-client";
import { useTranslation } from "react-i18next";
import { PaginatedQuery, PaginatedResult } from "@/data/dto";
import { nanoid } from "nanoid";

// Typ kontekstu:
type OrderContextType = {
  current: Order | null;
  orders: Order[];
  loaderStatus: DataLoadingStatus;
  refreshDataSync: string;

  // Metody
  listOrders: () => Promise<Order[]>;
  loadOrder: (orderId: string) => Promise<Order>;
  updateOrder: (order: Order, setAsCurrent?: boolean) => Promise<Order>;
  deleteOrder: (order: Order) => Promise<DeleteOrderResponse>;

  setCurrent: (order: Order | null) => void;
  setOrders: (orders: Order[]) => void;
  setLoaderStatus: (status: DataLoadingStatus) => void;

  // Jeśli potrzebujesz paginacji/filtr, analogicznie do queryProducts
  queryOrders: (params: PaginatedQuery) => Promise<PaginatedResult<Order[]>>;
};

// Tworzymy kontekst
const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const dbContext = useContext(DatabaseContext);
  const saasContext = useContext(SaaSContext);
  const { t } = useTranslation();

  // Stan
  const [current, setCurrent] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaderStatus, setLoaderStatus] = useState<DataLoadingStatus>(DataLoadingStatus.Idle);

  // np. do sygnalizowania, że nastąpiła zmiana => refresh
  const [refreshDataSync, setRefreshDataSync] = useState("");

  // Funkcja tworząca klienta API
  const setupApiClient = async (): Promise<OrderApiClient> => {
    const encryptionConfig = {
      secretKey: dbContext?.masterKey,
      useEncryption: false, // w razie potrzeby
    };
    const client = new OrderApiClient("", dbContext, saasContext, encryptionConfig);
    return client;
  };

  // 1. Pobranie listy zamówień
  const listOrders = async (): Promise<Order[]> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const client = await setupApiClient();
      const orderDTOs = await client.get(); // bez param => wszystkie
      // Zakładam, że client.get() zwraca tablicę OrderDTO
      const fetched = orderDTOs.rows.map((dto) => Order.fromDTO(dto));
      setOrders(fetched);
      setLoaderStatus(DataLoadingStatus.Success);
      return fetched;
    } catch (error) {
      console.error("listOrders error:", error);
      setLoaderStatus(DataLoadingStatus.Error);
      return [];
    }
  };

  // 2. Wczytanie pojedynczego zamówienia
  const loadOrder = async (orderId: string): Promise<Order> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const client = await setupApiClient();
      const dtos = await client.get(orderId); // get(orderId) → tablica (z jednym elementem?)
      if (dtos && dtos.rows.length > 0) {
        const loaded = Order.fromDTO(dtos.rows[0]);
        setLoaderStatus(DataLoadingStatus.Success);
        return loaded;
      } else {
        setLoaderStatus(DataLoadingStatus.Error);
        throw new Error(t("Order not found"));
      }
    } catch (error) {
      console.error("loadOrder error:", error);
      setLoaderStatus(DataLoadingStatus.Error);
      throw error;
    }
  };

  // 3. Tworzenie / aktualizacja zamówienia
  const updateOrder = async (order: Order, setAsCurrent: boolean = true): Promise<Order> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const client = await setupApiClient();

    if (!order.id || order.id === 'new') {
      const uniqueId = `ORD-${nanoid(5).toUpperCase()}`;
      order.id = uniqueId; // assign new unique id
    }

      const dto = order.toDTO();
      const response = await client.put(dto);
      if (response.status !== 200) {
        console.error("updateOrder error:", response);
        throw new Error(t("Error saving order: ") + (response as PutOrderResponseError).message);
      }

      // Zwrócona data to OrderDTO => konwertujemy do modelu
      // cast do success
      const updatedOrder = Order.fromDTO((response as PutOrderResponseSuccess).data);

      // Aktualizujemy stan
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === updatedOrder.id);
        if (idx === -1) {
          return [...prev, updatedOrder];
        } else {
          return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
        }
      });

      setRefreshDataSync(new Date().toISOString());
      if (setAsCurrent) {
        setCurrent(updatedOrder);
      }
      setLoaderStatus(DataLoadingStatus.Success);
      return updatedOrder;
    } catch (error) {
      setLoaderStatus(DataLoadingStatus.Error);
      console.error("updateOrder exception:", error);
      throw error;
    }
  };

  // 4. Usunięcie zamówienia
  const deleteOrder = async (order: Order): Promise<DeleteOrderResponse> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const client = await setupApiClient();
      const resp = await client.delete(order.id!);
      if (resp.status === 200) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        if (current?.id === order.id) {
          setCurrent(null);
        }
        setRefreshDataSync(new Date().toISOString());
        setLoaderStatus(DataLoadingStatus.Success);
      } else {
        console.error("deleteOrder error:", resp.message);
        setLoaderStatus(DataLoadingStatus.Error);
        throw new Error(t(resp.message));
      }
      return resp;
    } catch (error) {
      console.error("deleteOrder exception:", error);
      setLoaderStatus(DataLoadingStatus.Error);
      throw error;
    }
  };

  // 5. (Opcjonalnie) Paginacja i filtry
  const queryOrders = async (params: PaginatedQuery): Promise<PaginatedResult<Order[]>> => {
    setLoaderStatus(DataLoadingStatus.Loading);
    try {
      const client = await setupApiClient();
      // Zakładam, że client ma metodę query(params)
      // lub można dopisać custom logic
      const response = await client.query(params); 
      // response => np. { rows: OrderDTO[], total, limit, offset, ... }

      const ordersData = response.rows.map((dto: any) => Order.fromDTO(dto));

      setLoaderStatus(DataLoadingStatus.Success);
      return {
        ...response,
        rows: ordersData,
      };
    } catch (error) {
      console.error("queryOrders error:", error);
      setLoaderStatus(DataLoadingStatus.Error);
      throw error;
    }
  };

  // Wartość kontekstu
  const value: OrderContextType = {
    current,
    orders,
    loaderStatus,
    refreshDataSync,

    listOrders,
    loadOrder,
    updateOrder,
    deleteOrder,
    setCurrent,
    setOrders,
    setLoaderStatus,
    queryOrders,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

// Hook do użycia w komponentach
export const useOrderContext = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrderContext must be used within an OrderProvider");
  }
  return context;
};
