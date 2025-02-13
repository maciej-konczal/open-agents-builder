'use client'

import DataLoader from "@/components/data-loader";
import { SaaSContextLoader } from "@/components/saas-context-loader";
import { SaaSContext } from "@/contexts/saas-context";
import { useRouter } from "next/navigation";
import { Suspense, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function SharingPage() {
    const [isInitializing, setIsInitializing] = useState(true);
    const { t } = useTranslation();
    const [generalError, setGeneralError] = useState<string | null>(null);
    const saasContext = useContext(SaaSContext)
    const router = useRouter();

    useEffect(() => {
    }, [saasContext.saasToken]);


    return (       
      <div className="pt-10">
        <div className="text-center">
          <div className="flex justify-center m-4"><DataLoader /></div>
          <div className="text-gray-500 text-center">{t("Succesfully authorized, redirecting to app...")}</div>
        </div>
      </div>
    )

}