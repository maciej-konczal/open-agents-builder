import { useContext, useEffect, useState } from "react";
import { DatabaseAuthStatus, DataLoadingStatus } from "@/data/client/models";
import DataLoader from "./data-loader";
import { ConfigContext } from "@/contexts/config-context";
import { Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle } from "./credenza";
import { Button } from "./ui/button";
import DatabaseLinkAlert from "./shared/database-link-alert";
import { NoRecordsAlert } from "./shared/no-records-alert";
import { DatabaseContext } from "@/contexts/db-context";
import { KeyContext } from "@/contexts/key-context";
import { AuditContext } from "@/contexts/audit-context";
import AuditLogItem from "./audit-log-item";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function AuditLogPopup() {
  const configContext = useContext(ConfigContext);
  const dbContext = useContext(DatabaseContext);
  const keyContext = useContext(KeyContext);
  const auditContext = useContext(AuditContext);
  const [limit, setLimit] = useState(5);
  const [offset, setOffset] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    auditContext?.loadLogs(limit, offset).catch((e) => {
      toast.error(t(getErrorMessage(e)));
    });;
    keyContext.loadKeys();
  }, [limit, offset/*, auditContext?.lastAudit*/]); // we re not loading the records and keys each time new recod is added due to performance reasons

  return (
    <Credenza open={auditContext.auditLogOpen} onOpenChange={auditContext.setAuditLogDialogOpen}>
      <CredenzaContent className="sm:max-w-[700px] bg-background" side="top">
        <CredenzaHeader>
          <CredenzaTitle>{t('Audit log')}
          </CredenzaTitle>
          <CredenzaDescription>
            {t('Check which Keys had access and what was changed in your data. There could be a slight delay for new records to show. If you need inspect the last records please refresh the page.')}
          </CredenzaDescription>
        </CredenzaHeader>
        <div className="bg-background border-r border-zinc-200 dark:border-zinc-800">
          <div className="h-auto overflow-auto">
            
            {(dbContext?.authStatus == DatabaseAuthStatus.Authorized) ? (
              <div className="p-4 space-y-4">
                {auditContext?.loaderStatus === DataLoadingStatus.Loading ? (
                  <div className="flex justify-center">
                    <DataLoader />
                  </div>
                ) : (
                  (auditContext?.logs.length > 0) ?
                    auditContext?.logs.map((audit, index) => (
                      <AuditLogItem onClick={(e) => { auditContext.setCurrentAudit(audit); }} key={index} audit={audit} selected={auditContext?.currentAudit?.id === audit.id} />
                    ))
                    : (
                      <NoRecordsAlert title={t('Data is not shared')}>
                        {t('No logs found in database.')}
                      </NoRecordsAlert>
                    )
                )}
              </div>
            ) : (
              <DatabaseLinkAlert />
            )}
          </div>
          <div className="flex gap-2 items-right">
            {(auditContext.logs.length >= limit) ? (<Button variant="ghost" className="m-2" onClick={(e) => { setOffset(offset + limit); }}>&lt; {t('Prev')}</Button>) : null}            
            {(offset > 0) ? (<Button className="m-2" variant="ghost" onClick={(e) => { setOffset(offset - limit); }}>Next &gt;</Button>) : null}
            </div>

        </div>
      </CredenzaContent>
    </Credenza>
  );
}