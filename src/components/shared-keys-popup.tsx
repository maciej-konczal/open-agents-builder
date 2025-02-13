import { useContext, useEffect } from "react";
import { DatabaseAuthStatus, DataLoadingStatus } from "@/data/client/models";
import DataLoader from "./data-loader";
import { ConfigContext } from "@/contexts/config-context";
import { Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle } from "./credenza";
import DatabaseLinkAlert from "./shared/database-link-alert";
import { NoRecordsAlert } from "./shared/no-records-alert";
import { DatabaseContext } from "@/contexts/db-context";
import { KeyContext } from "@/contexts/key-context";
import SharedKeyItem from "./shared-key-item";
import { SharedKeyEditPopup } from "./shared-key-edit-popup";
import { useTranslation } from "react-i18next";

export default function SharedKeysPopup() {
  const configContext = useContext(ConfigContext);
  const { t } = useTranslation();
  const dbContext = useContext(DatabaseContext);
  const keysContext = useContext(KeyContext);

  useEffect(() => {
    keysContext?.loadKeys();
  }, []);

  return (
    <Credenza open={keysContext.sharedKeysDialogOpen} onOpenChange={keysContext.setSharedKeysDialogOpen}>
      <CredenzaContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950" side="top">
        <CredenzaHeader>
          <CredenzaTitle>{t('Shared keys')}
            {(dbContext?.authStatus == DatabaseAuthStatus.Authorized) ? (
              <SharedKeyEditPopup />
            ) : (null)}
          </CredenzaTitle>
          <CredenzaDescription>
            {t('Shared Keys let other users access your database.')} <br />{t('You can revoke access at any time.')}
          </CredenzaDescription>
        </CredenzaHeader>
        <div className="bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
          <div className="h-auto overflow-auto">
            {(dbContext?.authStatus == DatabaseAuthStatus.Authorized) ? (
              <div className="p-4 space-y-4">
                {keysContext?.loaderStatus === DataLoadingStatus.Loading ? (
                  <div className="flex justify-center">
                    <DataLoader />
                  </div>
                ) : (
                  (keysContext?.keys.length > 0) ?
                    keysContext?.keys.map((key, index) => (
                      <SharedKeyItem onClick={(e) => {}} key={index} sharedKey={key} selected={keysContext?.currentKey?.keyLocatorHash === key.keyLocatorHash} />
                    ))
                    : (
                      <NoRecordsAlert title={t('Data is not shared')}>
                        {t('No Shared Keys found in the database. Please add a new Shared Key using')} <strong>+</strong> {t('icon above.')}
                      </NoRecordsAlert>
                    )
                )}
              </div>
            ) : (
              <DatabaseLinkAlert />
            )}
          </div>
        </div>
      </CredenzaContent>
    </Credenza>
  );
}