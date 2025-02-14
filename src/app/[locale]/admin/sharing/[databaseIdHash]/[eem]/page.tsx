'use client'

import { DatabaseContext } from "@/contexts/db-context";
import { useRouter } from "next/navigation";
import { useContext, useEffect } from "react";

export default function SharingPage({children,
  params,
}: {
  children: React.ReactNode;
  params: { databaseIdHash: string, eem: string, locale: string };
})  {
    const router = useRouter();

    const dbContext = useContext(DatabaseContext);

    useEffect(() => {

      if(dbContext?.email) {
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