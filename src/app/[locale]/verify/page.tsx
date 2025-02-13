'use client'

import DataLoader from "@/components/data-loader";
import { SaaSContextLoader } from "@/components/saas-context-loader";
import { SaaSContext } from "@/contexts/saas-context";
import { useRouter } from "next/navigation";
import { Suspense, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function VerifyPage() {
    const [isInitializing, setIsInitializing] = useState(true);
    const { t } = useTranslation();
    const [generalError, setGeneralError] = useState<string | null>(null);
    const saasContext = useContext(SaaSContext)
    const router = useRouter();

    useEffect(() => {
        if (saasContext.saasToken) {
            saasContext.activateAccount(saasContext.saasToken).then(() => {
                setIsInitializing(false);
                toast.info(t('You account has been activated!'));
                router.push('/');
            }).catch(() =>{
                setGeneralError(t('Error while activating your account. Please contact support!'));
            })
        }
        
        // init
        setIsInitializing(false);
    }, [saasContext.saasToken]);


    return (
        <div className="pt-10">
            <div className="text-center">
                <Suspense fallback={<div>{t('Loading SaaSContext...')}</div>}>
                  <SaaSContextLoader />
                </Suspense>            
            </div>
          {isInitializing ? (
            <div className="text-center">
              <div className="flex justify-center m-4"><DataLoader /></div>
              <div className="text-gray-500 text-center">{t("Activating your account...")}</div>
            </div>
          ) : (
          generalError ? (
            <div className="text-center">
              <div className="flex justify-center m-4 text-red-400 text-2xl">{t('Error')}</div>
              <div className="text-red-500 text-center">{generalError}</div>
            </div>
          ): (null)
        )}
        </div>
    )

}