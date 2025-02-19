import { useContext, useEffect } from "react";
import { DatabaseAuthStatus } from "@/data/client/models";
import { Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle } from "./credenza";
import DatabaseLinkAlert from "./shared/database-link-alert";
import { NoRecordsAlert } from "./shared/no-records-alert";
import { DatabaseContext } from "@/contexts/db-context";
import { TemplateContext } from "@/contexts/template-context";
import { useTranslation } from "react-i18next";
import TemplateItem from "./template-item";
import { useAgentContext } from "@/contexts/agent-context";
import { toast } from "sonner";
import { SaveAsTemplateButton } from "./save-as-template";

export default function TemplateListPopup() {
  const dbContext = useContext(DatabaseContext);
  const templateContext = useContext(TemplateContext)
  const agentContext = useAgentContext();
  const { t } = useTranslation();

  useEffect(() => {
    templateContext?.listTemplates().catch((e) => {
      console.error(e);
      toast.error(t('Failed to load templates'));
    });
  }, [templateContext?.lastTemplateAdded])

  return (
    <Credenza open={templateContext?.templatePopupOpen} onOpenChange={templateContext?.setTemplatePopupOpen}>
      <CredenzaContent className="sm:max-w-[500px] bg-background">
        <CredenzaHeader>
          <CredenzaTitle>{t('Agent templates')}
          </CredenzaTitle>
          <CredenzaDescription>
            {t('Select a template to create a new agent with')}
          </CredenzaDescription>
        </CredenzaHeader>
        <div className="bg-background border-zinc-200 dark:border-zinc-800">
          <div className="h-auto overflow-y-scroll max-h-[500px]">
            {(dbContext?.authStatus == DatabaseAuthStatus.Authorized) ? (
              <div className="p-4 space-y-4">

                  {(templateContext?.templates?.length ?? 0 > 0) ?
                    templateContext?.templates.sort((a,b) => a.displayName.localeCompare(b.displayName)).map((template, index) => (
                      <TemplateItem key={index} template={template} selected={false} onClick={function (e: any): void {
                        //throw new Error("Function not implemented.");
                      } } />
                    ))
                    : (
                      <NoRecordsAlert title={t('No templates found')}>
                        {t('No templates found in the database. You could save a current agent as a new template.')}
                      </NoRecordsAlert>
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