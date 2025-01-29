'use client'
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { AlertDialogHeader, AlertDialogFooter } from "./ui/alert-dialog";
import { useAgentContext } from "@/contexts/agent-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AgentDeleteDialog() {

    const agentContext = useAgentContext();
    const router = useRouter();
    const { t } = useTranslation();
    
    return (
      <AlertDialog open={agentContext.agentDeleteDialogOpen} onOpenChange={agentContext.setAgentDeleteDialogOpen}>
        <AlertDialogContent className="w-[400px] bg-background text-sm p-4 rounded-lg shadow-lg border border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone. This will permanently delete your agent data') }    
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('No')}</AlertDialogCancel>
            <AlertDialogAction className='' onClick={async (e) => 
              {
                try {
                    if(agentContext.current?.id  && agentContext.current?.id !== 'new') {
                    const resp = await agentContext.deleteAgent(agentContext.current)
                    localStorage.removeItem('currentAgentId');
                    router.push(`/agent/new/general`);
                    }
                } catch (e) {
                    console.error(e);
                    toast.error(t('Failed to delete agent'));
                }
              }
            }>{t('YES')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> 
    )
}