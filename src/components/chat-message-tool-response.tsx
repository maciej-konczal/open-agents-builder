import { useTranslation } from "react-i18next";
import { Credenza, CredenzaContent, CredenzaTrigger } from "./credenza";
import JsonView from "@uiw/react-json-view";
import { ScrollArea } from "./ui/scroll-area";
import { CodeIcon } from "lucide-react";
import { Button } from "./ui/button";

export function ChatMessageToolResponse( { result }: { result: any}) {
    const { t } = useTranslation();
    return (
        <Credenza>
            <CredenzaTrigger asChild>
                <Button className="ml-auto right-20 mr-2" size={"sm"} variant="secondary">
                    <CodeIcon className="w-4 h-4" />{t('Open details')}
                </Button>
            </CredenzaTrigger>
            <CredenzaContent>
                <ScrollArea className="h-96">
                   <JsonView value={result} />
                </ScrollArea>
            </CredenzaContent>
        </Credenza>
    )    
}