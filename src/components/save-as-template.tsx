import { useAgentContext } from "@/contexts/agent-context";
import { DatabaseContext } from "@/contexts/db-context";
import { useTemplateContext } from "@/contexts/template-context";
import { Agent, DatabaseAuthStatus } from "@/data/client/models";
import { SaveIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "./ui/button";

export function SaveAsTemplateButton() {
    const { t } = useTranslation();
    const dbContext = useContext(DatabaseContext);
    const agentContext = useAgentContext();
    const templateContext = useTemplateContext();
return (dbContext?.authStatus == DatabaseAuthStatus.Authorized) ? (
        <Button variant={"outline"} className="absolute right-5 top-7" size="sm" onClick={(e) => {
          if (agentContext.current) {
            templateContext?.updateTemplate(new Agent({ ...agentContext.current, id: nanoid() } as Agent));
            toast.info(t('Current agent has been saved as a template'))
          }

        }}>
          <SaveIcon className="w-6 h-6" />{t('Save as template')}
        </Button>
      ) : (null);
}