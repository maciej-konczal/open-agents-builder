import { useAgentContext } from "@/contexts/agent-context";
import { AgentDTO } from "@/data/dto";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { LayoutTemplateIcon } from "lucide-react";
import { useContext } from "react";
import { TemplateContext } from "@/contexts/template-context";
import { toast } from "sonner";
import { Agent } from "@/data/client/models";
import { nanoid } from "nanoid";

export function SaveAgentAsTemplateButton({ agent, onSaved }: { agent: Agent | null; onSaved: () => void }) {

    const { t, i18n } = useTranslation();
    const templateContext = useContext(TemplateContext);
    const agentContext = useAgentContext();
    
    return agentContext.current && agentContext.current.id !== 'new' ? (
        <Button variant="secondary" className="font-light"  onClick={async (e) => {
            try {
                e.preventDefault();
                if (agentContext.current) {
                    await templateContext?.updateTemplate(new Agent({ ...agentContext.current, id: nanoid(), locale: i18n.language } as Agent));
                    toast.info(t('Current agent has been saved as a template'))
                }              
            } catch (e) {
                console.error(e);
                toast.error(t('Failed to save agent as a template'));
            }
        }}><LayoutTemplateIcon className="mr-2 h-4 w-4"/>{t('Save agent as template')}</Button>

        ) : null;
}