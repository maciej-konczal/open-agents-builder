'use client'

import DataLoader from "@/components/data-loader";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function VerifyPage() {
    const [isInitializing, setIsInitializing] = useState(true);
    const { t } = useTranslation();
    const [generalError, setGeneralError] = useState<string | null>(null);

    useEffect(() => {
        
        // init
        setIsInitializing(false);
    }, []);


    return (
        <div className="pt-10">
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