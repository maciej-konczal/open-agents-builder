import { useTranslation } from "react-i18next";
import { Credenza, CredenzaContent, CredenzaTrigger } from "./credenza";
import JsonView from "@uiw/react-json-view";
import { ScrollArea } from "./ui/scroll-area";
import { CodeIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { githubLightTheme } from '@uiw/react-json-view/githubLight';
import { githubDarkTheme } from '@uiw/react-json-view/githubDark';

export function ChatMessageToolResponse( { args, result }: { args: any, result: any}) {
    const { t } = useTranslation();
    const { theme, systemTheme } = useTheme();
    const currentTheme = (theme === 'system' ? systemTheme : theme)
    
    return (
        <Credenza >
            <CredenzaTrigger asChild>
                <Button className="ml-auto right-20 mr-2" size={"sm"} variant="secondary">
                    <CodeIcon className="w-4 h-4" />{t('Open details')}
                </Button>
            </CredenzaTrigger>
            <CredenzaContent className="w-full">
                {t('Arguments')}:
                <ScrollArea className="h-32">
                   <JsonView style={currentTheme === 'dark' ? githubDarkTheme : githubLightTheme } value={args} />
                </ScrollArea>

                {t('Result')}:
                <ScrollArea className="h-96">
                   <JsonView style={currentTheme === 'dark' ? githubDarkTheme : githubLightTheme } value={result} />
                </ScrollArea>
            </CredenzaContent>
        </Credenza>
    )    
}