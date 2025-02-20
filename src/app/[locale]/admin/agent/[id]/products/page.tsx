"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import InfiniteScroll from "@/components/infinite-scroll";
import { NoRecordsAlert } from "@/components/shared/no-records-alert";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import { getErrorMessage } from "@/lib/utils";

import { useProductContext } from "@/contexts/product-context";

import { Product } from "@/data/client/models"; 
import { PaginatedQuery, PaginatedResult } from "@/data/dto"; 
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ProductsPage() {
  const router = useRouter();
  const productContext = useProductContext();

  const { t } = useTranslation();
  
  // Stan do obsługi zapytania paginacyjnego
  const [productsQuery, setProductsQuery] = useState<PaginatedQuery>({
    limit: 4,
    offset: 0,
    orderBy: "createdAt",
    query: "",
  });
  const [debouncedSearchQuery] = useDebounce(productsQuery, 500);

  // Stan do przechowywania wyników paginacji (rows + meta)
  const [productsData, setProductsData] = useState<PaginatedResult<Product[]>>({
    rows: [],
    total: 0,
    limit: 4,
    offset: 0,
    orderBy: "createdAt",
    query: "",
  });

  const [productsLoading, setProductsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 4; // przyrost kolejnych stron

  // Efekt: kiedy zmieni się debouncedSearchQuery, pobieramy pierwszą stronę
  useEffect(() => {
    (async () => {
      setProductsLoading(true);
      try {
        const response = await productContext.queryProducts({
          limit: debouncedSearchQuery.limit,
          offset: 0,
          orderBy: debouncedSearchQuery.orderBy,
          query: debouncedSearchQuery.query,
        });
        // Zapisz w stanie
        setProductsData({
          ...response,
          rows: response.rows.map((dto) => Product.fromDTO(dto)),
        });
        setHasMore(response.rows.length < response.total);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
      setProductsLoading(false);
    })();
  }, [debouncedSearchQuery, productContext]);

  // Gdy productsData się zmieni – aktualizujemy hasMore itp.
  useEffect(() => {
    // Jeżeli offset + limit >= total, to nie ma więcej
    setHasMore(
      productsData.offset + productsData.limit < productsData.total
    );
  }, [productsData]);

  // Funkcja do pobierania kolejnych produktów
  const loadMore = async () => {
    if (productsLoading) return;
    const newOffset = productsData.limit + productsData.offset;
    if (newOffset >= productsData.total) {
      setHasMore(false);
      return;
    }
    setProductsLoading(true);

    try {
      const response = await productContext.queryProducts({
        limit: pageSize, // pobierz np. +4 kolejnych
        offset: newOffset,
        orderBy: productsData.orderBy,
        query: productsData.query,
      });

      setProductsData((prev) => ({
        rows: [
          ...prev.rows,
          ...response.rows.map((dto) => Product.fromDTO(dto)),
        ],
        total: response.total,
        limit: prev.limit + response.limit, // albo sumuj, zależnie jak liczycie
        offset: newOffset,
        orderBy: prev.orderBy,
        query: prev.query,
      }));
      setHasMore(newOffset + response.limit < response.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }

    setProductsLoading(false);
  };

  // Render
  return (
    <div className="space-y-6">
      {/* Pole wyszukiwania */}
      <Input
        placeholder={"Search products..."}
        onChange={(e) => {
          setProductsQuery({
            ...productsQuery,
            query: e.target.value,
          });
        }}
        value={productsQuery.query}
      />

      {/* Jeśli brak rekordów, pokaż alert */}
      {productsData.rows.length === 0 && !productsLoading ? (
        <NoRecordsAlert title={t("No products found")}>
          {t("Try adjusting your search or add new products.")}
        </NoRecordsAlert>
      ) : null}

      {/* Lista produktów */}
      {productsData.rows.map((product) => (
        <Card key={product.id}>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {/* Główne zdjęcie */}
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="max-w-sm mb-2"
              />
            )}

            {/* Pozostałe zdjęcia – product.images to tablica Attachment */}
            {product.images && product.images.length > 0 && (
              <div className="flex flex-row gap-2 mb-2">
                {product.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.url}
                    alt={img.alt || product.name}
                    className="w-16 h-16 object-cover"
                  />
                ))}
              </div>
            )}

            {/* Opis */}
            {product.description && <p className="mb-2">{product.description}</p>}

            {/* Atrybuty */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="mb-2">
                <strong>Attributes:</strong>
                <ul>
                  {product.attributes.map((attr, idx) => (
                    <li key={idx}>
                      {attr.name}:{" "}
                      {attr.type === "select"
                        ? `(select) [${(attr.possibleValues || []).join(", ")}]`
                        : attr.defaultValue ?? ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Przykładowy przycisk: zobacz szczegóły */}
            <Button
              variant="secondary"
              onClick={() => {
                // np. przejście do strony szczegółów
                router.push(`/admin/products/${product.id}`);
              }}
            >
              View details
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Infinite scroll */}
      <InfiniteScroll
        hasMore={hasMore}
        isLoading={productsLoading}
        next={loadMore}
        threshold={1}
      >
        {/* loader w trakcie wczytywania */}
        {hasMore && productsLoading && (
          <div className="flex justify-center">
            <Loader2 className="my-4 h-8 w-8 animate-spin" />
          </div>
        )}
      </InfiniteScroll>
    </div>
  );
}
