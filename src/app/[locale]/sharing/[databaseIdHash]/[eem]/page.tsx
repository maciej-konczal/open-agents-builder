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

export default function SharingPage({children,
  params,
}: {
  children: React.ReactNode;
  params: { databaseIdHash: string, eem: string, locale: string };
})  {
    const { t } = useTranslation();
    const saasContext = useContext(SaaSContext)
    const encryptionUtils = new EncryptionUtils(keepLoggedInKeyPassword)

    const dbContext = useContext(DatabaseContext);
    const [decodedEem, setDecodedEem] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        (async () => {
          const encryptionUtils = new EncryptionUtils(keepLoggedInKeyPassword)
          setDecodedEem(await encryptionUtils.decrypt(params.eem))
        })();

    }, [params.eem, params.databaseIdHash]);

    useEffect(() => {

      if(dbContext?.email) {
      }
    }, [dbContext?.email]);


    return (       
      <AuthorizationGuard email={decodedEem} databaseIdHash={params.databaseIdHash} sharingView={true}>
        <div className="pt-10">
          <div className="text-center">
            <div className="flex justify-center m-4"><DataLoader /></div>
            <div className="text-gray-500 text-center">{t("Succesfully authorized, redirecting to app...")}</div>
          </div>
        </div>
      </AuthorizationGuard>
    )

}