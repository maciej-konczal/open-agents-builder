'use client'
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { AlertDialogHeader, AlertDialogFooter } from "./ui/alert-dialog";
import { useAgentContext } from "@/contexts/agent-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Session } from "@/data/client/models";
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog";
import { Button } from "./ui/button";
import { Trash2Icon } from "lucide-react";

export function SessionDeleteDialog({ session }: { session: Session}) {

    const agentContext = useAgentContext();
    const router = useRouter();
    const { t } = useTranslation();
    
    return (
      <AlertDialog>
        <AlertDialogTrigger>
          <Button className="ml-auto right-20 mr-2" size={"sm"} variant="secondary" onClick={() => {
          }}>
            <Trash2Icon className="w-4 h-4 mr-2" />{t('Delete session')}
          </Button>

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
                try {
                    if(agentContext.current?.id  && agentContext.current?.id !== 'new') {
                      const resp = await agentContext.deleteSession(session)
                      if (resp.status === 200 ) {
                        toast.info(resp.message)
                      } else {
                        toast.error(resp.message)
                      }
                    }
                } catch (e) {
                    console.error(e);
                    toast.error(t('Failed to delete session'));
                }
              }
            }>{t('YES')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> 
    )
}