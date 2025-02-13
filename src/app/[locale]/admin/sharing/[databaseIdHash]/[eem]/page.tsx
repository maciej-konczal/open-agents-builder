'use client'

import AuthorizationGuard from "@/components/authorization-guard";
import DataLoader from "@/components/data-loader";
import { SaaSContextLoader } from "@/components/saas-context-loader";
import { DatabaseContext, keepLoggedInKeyPassword } from "@/contexts/db-context";
import { SaaSContext } from "@/contexts/saas-context";
import { EncryptionUtils } from "@/lib/crypto";
import { useRouter } from "next/navigation";
import { Suspense, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { redirect } from 'next/navigation';
import Link from "next/link";

export default function SharingPage({children,
  params,
}: {
  children: React.ReactNode;
  params: { databaseIdHash: string, eem: string, locale: string };
})  {
    const { t } = useTranslation();
    const saasContext = useContext(SaaSContext)
    const encryptionUtils = new EncryptionUtils(keepLoggedInKeyPassword)
    const router = useRouter();

    const dbContext = useContext(DatabaseContext);

    useEffect(() => {

      if(dbContext?.email) {
        // TODO: use client side redirection
        router.push('/admin/agent');
      }
    }, [dbContext?.email]);


    return (       
        <div className="pt-10">
          <div className="text-center">
            {/* <div className="flex justify-center m-4"><DataLoader /></div>
            <div className="text-gray-500 text-center">{t("Succesfully authorized, redirecting to app...")}</div> */}
          </div>
        </div>
    )

}