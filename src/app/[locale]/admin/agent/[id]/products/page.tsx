"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import InfiniteScroll from "@/components/infinite-scroll";
import { NoRecordsAlert } from "@/components/shared/no-records-alert";
import { BoxIcon, FolderOpenIcon, Loader2, OptionIcon, TagIcon, TextCursorInputIcon, TextIcon } from "lucide-react";
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
import { useAgentContext } from "@/contexts/agent-context";
import { SelectIcon } from "@radix-ui/react-select";
import ZoomableImage from "@/components/zoomable-image";
import { ProductDeleteDialog } from "@/components/product-delete-dialog";
import Image from "next/image";
import { Price } from "@/components/price";

export default function ProductsPage() {
  const router = useRouter();
  const productContext = useProductContext();
  const agentContext = useAgentContext();   

  const { t } = useTranslation();
  
  // Stan do obsługi zapytania paginacyjnego
  const [productsQuery, setProductsQuery] = useState<PaginatedQuery>({
    limit: 4,
    offset: 0,
    orderBy: "createdAt",
    query: "",
  });
  const [debouncedSearchQuery] = useDebounce(productsQuery, 500);

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
  }, [debouncedSearchQuery, productContext.refreshDataSync]);

  useEffect(() => {
    setHasMore(
      productsData.offset + productsData.limit < productsData.total
    );
  }, [productsData]);

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
        limit: pageSize, 
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
        limit: prev.limit + response.limit, 
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
      <div className="flex space-x-2">
        <Link href={"/admin/agent/" + agentContext.current?.id + "/products/new"}>
            <Button size="sm" variant="outline">
                <BoxIcon className="w-4 h-4 mr-2" />
                {t("Add new product...")}</Button>
        </Link>
        </div>

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

      {productsData.rows.length === 0 && !productsLoading ? (
        <NoRecordsAlert title={t("No products found")}>
          {t("Try adjusting your search or add new products.")}
        </NoRecordsAlert>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
      {productsData.rows.map((product) => (
        <Card key={product.id} className="">
          <CardHeader>
            <CardTitle>
                <Button
                    className="mr-2"
                    variant="secondary"
                    onClick={() => {
                       router.push("/admin/agent/" + encodeURIComponent(agentContext.current?.id || '') + "/products/" + encodeURIComponent(product.id || ''));
                    }}
                >
                <FolderOpenIcon className="w-4 h-4" />
            </Button>
            <Link href={"/admin/agent/" + encodeURIComponent(agentContext.current?.id || '') + "/products/" + encodeURIComponent(product.id || '')}>{product.name}</Link></CardTitle>
            <div className="flex items-center text-sm space-x-2 mt-4">
                <div className="flex space-x-2"><TagIcon className="w-4 h-4 mr-2" /> {t('Price: ')} </div>
                <div>
                    <Price currency={product.priceInclTax?.currency || ''} price={product.priceInclTax?.value} />
                </div>
            </div>
            {product.variants && product.variants.length > 0 ? (
                <div className="flex items-center text-sm space-x-2 mt-4">
                    <div className="flex space-x-2"><OptionIcon className="w-4 h-4 mr-2" /> {t('Variants: ')} </div>
                    <div>
                        {product.variants.length}
                    </div>
                </div>
            ) : null}

          </CardHeader>
          <CardContent className="text-sm">
            {product.imageUrl && (
            <Link href={"/admin/agent/" + agentContext.current?.id + "/products/" + product.id}>
                <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="mb-2 cursor-pointer"
                />
            </Link>
            )}

            {product.images && product.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {product.images.map((img, idx) => (
                  <ZoomableImage
                    key={idx}
                    src={img.url}
                    alt={img.alt || product.name}
                    className="w-16 h-16 object-cover cursor-pointer"
                  />
                ))}
              </div>
            )}

            {product.description && <p className="mb-6 mt-6 text-xs">{product.description}</p>}

            {product.attributes && product.attributes.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                  {product.attributes.slice(0, product.attributes.length > 4 ? 4 : product.attributes.length).map((attr, idx) => (
                    <div key={idx} className="flex items-center text-xs p-2 border rounded w-fit">
                      {attr.type === "select" ? (
                        <TextIcon className="w-4 h-4 mr-1" />
                      ) : (
                        <TextCursorInputIcon className="w-4 h-4 mr-1" />
                      )}
                      {attr.name}:{" "}
                      {attr.type === "select"
                        ? `${(attr.values || []).join(" / ")}`
                        : attr.defaultValue ?? ""}
                    </div>
                  ))}
                </div>
            )}
            <div className="flex justify-end">
              <ProductDeleteDialog  product={product} />
            </div>
          </CardContent>
        </Card>
      ))}
</div>
      <InfiniteScroll
        hasMore={hasMore}
        isLoading={productsLoading}
        next={loadMore}
        threshold={1}
      >
        {productsLoading && (
          <div className="flex justify-center">
            <Loader2 className="my-4 h-8 w-8 animate-spin" />
          </div>
        )}
      </InfiniteScroll>
    </div>
  );
}
