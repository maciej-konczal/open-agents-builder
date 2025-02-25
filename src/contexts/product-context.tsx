import React, { createContext, useState, useContext, ReactNode } from "react";
import { DatabaseContext } from "./db-context";
import { SaaSContext } from "./saas-context";
import { DataLoadingStatus } from "@/data/client/models";
import { Product } from "@/data/client/models";
import { ProductApiClient, DeleteProductResponse, PutProductResponseSuccess } from "@/data/client/product-api-client";
import { useTranslation } from "react-i18next";
import { AttachmentDTO, PaginatedQuery, PaginatedResult, ProductDTO } from "@/data/dto";
import JSZip from "jszip";
import { AttachmentApiClient } from "@/data/client/attachment-api-client";
import { toast } from "sonner";
import { getCurrentTS } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

type ProductContextType = {
    current: Product | null;
    products: Product[];
    loaderStatus: DataLoadingStatus;
    refreshDataSync: string;

    listProducts: () => Promise<Product[]>;
    loadProduct: (productId: string) => Promise<Product>;
    updateProduct: (product: Product, setAsCurrent?: boolean) => Promise<Product>;
    deleteProduct: (product: Product) => Promise<DeleteProductResponse>;

    setCurrent: (product: Product | null) => void;
    setProducts: (products: Product[]) => void;
    setLoaderStatus: (status: DataLoadingStatus) => void;

    queryProducts: (params: PaginatedQuery) => Promise<PaginatedResult<Product[]>>;

    exportProducts: () => void;
    importProducts: (zipFileInput: ArrayBuffer) => void;
};

// Tworzymy kontekst
const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Provider
export const ProductProvider = ({ children }: { children: ReactNode }) => {
    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);
    const { t } = useTranslation();

    // Stany
    const [current, setCurrent] = useState<Product | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [refreshDataSync, setRefreshDataSync] = useState("");
    const [loaderStatus, setLoaderStatus] = useState<DataLoadingStatus>(DataLoadingStatus.Idle);

    const setupApiClient = async (): Promise<ProductApiClient> => {
        const encryptionConfig = {
            secretKey: dbContext?.masterKey,
            useEncryption: false,
        };
        const client = new ProductApiClient("", dbContext, saasContext, encryptionConfig);
        return client;
    };


    const importProducts = async (zipFileInput:ArrayBuffer) => {
        const zip = new JSZip();
        const zipFile = await zip.loadAsync(zipFileInput);
        const dataFile = zipFile.file("products.json");
        if (!dataFile) return;
        const rawData = await dataFile.async("string");
        const products = JSON.parse(rawData);

        try {
            for (const prod of (products as ProductDTO[]).map((p) => Product.fromDTO(p))) {
                try {
                    const newImages = [];
                    let index = 0;
                    const uploadedAttachments: AttachmentDTO[] = [];

                    if (prod.images) {
                        for (const img of prod.images) {
                            const imageFile = zipFile.file(img.url);
                            if (imageFile) {
                                const fileContent = await imageFile.async("arraybuffer");

                                try {
                                    const apiClient = new AttachmentApiClient('', 'commerce', dbContext, saasContext, {
                                    useEncryption: false  // for FormData we're encrypting records by ourselves - above
                                    })
                                    toast.info('Uploading attachment: ' + img.alt);

                                    const file = new File([fileContent], img.fileName ? img.fileName : `${prod.sku}-${index}`, { type: img.mimeType });
                                    const formData = new FormData();

                                    const attachmentDTO: AttachmentDTO = {

                                        id: img.id ? parseInt(img.id) : undefined,
                                        displayName: file.name,
                                        description: '',
                                        
                                        mimeType: img.mimeType,
                                        size: file.size,
                                        
                                        createdAt: getCurrentTS(),
                                        updatedAt: getCurrentTS(),         
                                                  
                                        storageKey: img.storageKey ? img.storageKey : uuidv4(),
                                    };

                                    formData.append("file", file); // TODO: encrypt file here
                                    formData.append("attachmentDTO", JSON.stringify(attachmentDTO));

                                    const result = await apiClient.put(formData);
                                    if (result.status === 200) {
                                        const uploadedAtt = result.data as AttachmentDTO;
                                        console.log('Attachment saved', uploadedAtt);
                                        uploadedAttachments.push(uploadedAtt);
                                    } else {
                                        console.error('Error saving attachment', result);
                                        toast.error(t('Error saving attachment: ') + result.message);
                                    }
                                } catch (error) {
                                    console.error(error);
                                    toast.error('Error saving attachment: ' + error);
                                } 
            
                                // upload fileContent here, then push new info to newImages
                            }
                        }
                    }
                    prod.images = uploadedAttachments.map((a) => ({
                        alt: a.displayName,
                        fileName: a.displayName,
                        url: `${process.env.NEXT_PUBLIC_APP_URL}/storage/product/${dbContext?.databaseIdHash}/${a.storageKey}`,
                        storageKey: a.storageKey,
                        mimeType: a.mimeType ?? `application/binary`,
                    }));


                    prod.imageUrl = prod.images.length > 0 ? prod.images[0].url : '';
                    await updateProduct(prod); // assume updateProduct is available


                } catch (error) {
                    console.error('Error importing product', prod, error);
                    toast.error(t('Error importing product: ') + prod.sku);
                }
            }
        } catch (error) {
            console.error('Error importing products', error);
            toast.error(t('Error importing products. Check the file format.'));
        }
        
    }


    const exportProducts = async () => {        
        const apiClient = new ProductApiClient('', dbContext, saasContext);
        const a = document.createElement('a');
        const file = new Blob([await apiClient.export() ?? ''], {type: 'application/zip'});
        a.href= URL.createObjectURL(file);
        a.download = `products.zip`;
        a.click();
    }    

    const queryProducts = async (params: PaginatedQuery): Promise<PaginatedResult<Product[]>> => {
        setLoaderStatus(DataLoadingStatus.Loading);
        try {
          const client = await setupApiClient();
          const response = await client.query(params);

          setLoaderStatus(DataLoadingStatus.Success);
          return {
                ...response,
                rows: response.rows.map((r: any) => Product.fromDTO(r))
            }            
          
        } catch (error) {
          console.error(error);
          setLoaderStatus(DataLoadingStatus.Error);
          throw error;
        }
      };   

    const loadProduct = async (productId: string): Promise<Product> => {
        setLoaderStatus(DataLoadingStatus.Loading);
        const client = await setupApiClient();
        const response = await client.get(productId);
        if (response && response.total > 0) {
            setLoaderStatus(DataLoadingStatus.Success);
            return Product.fromDTO(response.rows[0])
        }
        else {
            setLoaderStatus(DataLoadingStatus.Error);
            throw new Error(t('Product not found'));
        }
    }



    const listProducts = async (): Promise<Product[]> => {
        setLoaderStatus(DataLoadingStatus.Loading);

        try {
            const client = await setupApiClient();
            // Możemy skorzystać z get() bez parametrów -> cała lista
            const productDTOs = await client.get();
            const fetchedProducts = productDTOs.map((dto) => Product.fromDTO(dto));

            setProducts(fetchedProducts);
            setLoaderStatus(DataLoadingStatus.Success);
            return fetchedProducts;
        } catch (error) {
            console.error("listProducts error:", error);
            setLoaderStatus(DataLoadingStatus.Error);
            return [];
        }
    };

    const updateProduct = async (
        product: Product,
        setAsCurrent: boolean = true
    ): Promise<Product> => {
        const client = await setupApiClient();
        const dto = product.toDTO();

        const response = await client.put(dto);
        if (response.status !== 200) {
            console.error(response.message);
            throw new Error(t(response.message));
        }

        const updatedProduct = Product.fromDTO((response as PutProductResponseSuccess).data);
        setProducts((prev) => {

            const exists = prev.findIndex((p) => p.id === updatedProduct.id);
            if (exists === -1) {
                return [...prev, updatedProduct];
            } else {
                return prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
            }
        });

        setRefreshDataSync(new Date().toISOString());

        if (setAsCurrent) {
            setCurrent(updatedProduct);
        }
        return updatedProduct;
    };

    const deleteProduct = async (product: Product): Promise<DeleteProductResponse> => {
        const client = await setupApiClient();
        const resp = await client.delete(product.toDTO());

        if (resp.status === 200) {
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
            if (current?.id === product.id) {
                setCurrent(null);
            }
            setRefreshDataSync(new Date().toISOString());
        } else {
            console.error(resp.message);
            throw new Error(t(resp.message));
        }

        return resp;
    };

    // Wartości udostępniane w kontekście
    const value: ProductContextType = {
        current,
        products,
        loaderStatus,
        listProducts,
        updateProduct,
        deleteProduct,
        setCurrent,
        setProducts,
        setLoaderStatus,
        queryProducts,
        loadProduct,
        refreshDataSync,
        exportProducts,
        importProducts
    };

    return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

// Hook do użycia w komponentach
export const useProductContext = (): ProductContextType => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error("useProductContext must be used within a ProductProvider");
    }
    return context;
};
