import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@radix-ui/react-alert-dialog";
import { t } from "i18next";
import { Trash2Icon } from "lucide-react";
import router from "next/router";
import { AlertDialogHeader, AlertDialogFooter } from "./ui/alert-dialog";
import { useAgentContext } from "@/contexts/agent-context";
import { Button } from "./ui/button";

export function AgentDeleteDialog() {

    const agentContext = useAgentContext();
    
    return (
        <AlertDialog>
        <AlertDialogTrigger>
          {agentContext.current?.id !== 'new' ? (
          <Button variant={"secondary"} size="sm">
            <Trash2Icon className="mr-2 h-4 w-4"  />
            {t('Delete agent')}
          </Button>        
          ) : null}
        </AlertDialogTrigger>
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
                if(agentContext.current?.id  && agentContext.current?.id !== 'new') {
                  const resp = await agentContext.deleteAgent(agentContext.current)
                  localStorage.removeItem('currentAgentId');
                  router.push(`/agent/new/general`);
                }

              }
            }>YES</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> 
    )
}