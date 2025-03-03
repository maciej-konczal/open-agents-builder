'use client'
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { AlertDialogHeader, AlertDialogFooter } from "./ui/alert-dialog";
import { useAgentContext } from "@/contexts/agent-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UseFormHandleSubmit } from "react-hook-form";

export function AgentIsDirtyDialog( { saveChanges }: { saveChanges: () => void } ) {

    const agentContext = useAgentContext();
    const router = useRouter();
    const { t } = useTranslation();
    
    return (
      <AlertDialog open={agentContext.agentDeleteDialogOpen} onOpenChange={agentContext.setAgentDeleteDialogOpen}>
        <AlertDialogContent className="w-[400px] bg-background text-sm p-4 rounded-lg shadow-lg border border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('You have unsaved changes')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('You need to save current changes in order to run the flow. Do you want to save the changes?') }    
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('No')}</AlertDialogCancel>
            <AlertDialogAction className='' onClick={async (e) => 
              saveChanges()
            }>{t('YES')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> 
    )
}