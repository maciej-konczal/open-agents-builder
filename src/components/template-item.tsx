import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContext } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { TemplateContext } from "@/contexts/template-context";
import { useTranslation } from "react-i18next";
import { Agent } from "@/data/client/models";

export default function TemplateItem({ template, selected, onClick }: { template: Agent, selected: boolean, onClick: (e: any) => void}) {
  const templateContext = useContext(TemplateContext);
  const { t } = useTranslation();

  return (
    <Link
      className={`flex items-center gap-3 p-3 rounded-md bg-background ${selected ? " " : "" }`}
      href=""
      onClick={onClick}
    >
      <Avatar className="w-10 h-10">
        <AvatarFallback>{template.displayName[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1" onClick={(e) => { e.preventDefault(); }} >
        <div className="font-medium">{template.displayName}</div>
      </div>
      <div className="w-10">

      <AlertDialog>
          <AlertDialogTrigger>
            <Button size="icon" variant="ghost" title={t('Delete record')}>
              <Trash2Icon className="w-4 h-4"/>
            </Button>            
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-background">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('Are you sure')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('This action cannot be undone. This will permanently delete your template data')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('No')}</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => 
                {
                  templateContext?.deleteTemplate(template);
                }
              }>YES</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>       
      </div>
             
    </Link>
  );
}