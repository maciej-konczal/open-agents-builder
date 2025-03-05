'use client'
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { AlertDialogHeader, AlertDialogFooter } from "../ui/alert-dialog";
import { useAgentContext } from "@/contexts/agent-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { AgentFlow } from "@/data/client/models";
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog";
import { Button } from "../ui/button";
import { Trash2Icon } from "lucide-react";

export function FlowsDeleteDialog({ agentFlow, onDeleteFlow }: { agentFlow: AgentFlow, onDeleteFlow: (agentFlow: AgentFlow) => void }) {

    const agentContext = useAgentContext();
    const router = useRouter();
    const { t } = useTranslation();
    
    return (
      <AlertDialog>
        <AlertDialogTrigger>
          <Button className="ml-2 right-20" size={"sm"} variant="secondary" onClick={() => {
          }}>
            <Trash2Icon className="w-4 h-4 mr-2" />{t('Delete flow')}
          </Button>

        </AlertDialogTrigger>
        <AlertDialogContent className="w-[400px] bg-background text-sm p-4 rounded-lg shadow-lg border border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you sure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone. This will permanently delete your flow data') }    
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('No')}</AlertDialogCancel>
            <AlertDialogAction className='' onClick={async (e) => 
              {
                onDeleteFlow(agentFlow);                
              }
            }>{t('YES')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> 
    )
}