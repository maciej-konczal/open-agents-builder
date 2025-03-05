import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "./ui/dialog";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { DialogHeader } from "./ui/dialog";
import { useContext, useEffect, useState } from "react";
import { TemplateContext } from "@/contexts/template-context";
import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import { set } from "date-fns";
import { useAgentContext } from "@/contexts/agent-context";
import { useRouter } from "next/navigation";
import { Checkbox } from "./ui/checkbox";
import { Label } from "@uiw/react-json-view";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export function OnboardingDialog() {

    const templateContext = useContext(TemplateContext);
    const agentContext = useAgentContext();
    const router = useRouter();

    const { theme, systemTheme } = useTheme();
    const currentTheme = (theme === 'system' ? systemTheme : theme)  

    const { t } = useTranslation();

    useEffect(() => {
        if (localStorage.getItem('onboarding') === 'false') {
            templateContext?.setOnboardingOpen(false);
        } else {
            templateContext?.setOnboardingOpen(true);
        }
    }, []);

    return (
        <Dialog open={templateContext?.onboardingOpen} onOpenChange={(v) =>{
            templateContext?.setOnboardingOpen(v);
        }}>
            <DialogContent className="sm:max-w-[600px] md:max-w-[800px] z-50 bg-background">
                <DialogHeader>
                    {templateContext?.onboardingWellcomeHeader ? (
                        <DialogTitle className="text-center items-center justify-center">
                            <div className="flex justify-center"><img src={currentTheme === 'dark' ? "/img/OAB-Logo-Small-dark.svg" : "/img/OAB-Logo-Small.svg"} className="w-40 h-40" /></div>
                            <h2 className="text-2xl font-bold">{t('Welcome to Open Agents Builder')}</h2>
                            <p className="text-sm pt-3 pb-3">{t('In Open Agents Builder, you create an AI Assistant that will chat with your customers, colleagues, or anyone who gets the link. Choose a template to get started creating your first Assistant.')}</p>
                        </DialogTitle>
                    ) : (
                        <DialogTitle className="text-center items-center justify-center">
                            <h2 className="text-2xl font-bold">{t('Choose a template')}</h2>
                        </DialogTitle>
                    )}
                </DialogHeader>
                    <ScrollArea className="maxh-[60vh] pr-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {templateContext?.templates.filter(t=>t.icon).map((template, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                            <CardContent className="p-4">
                                <div className="flex items-center mb-3">
                                    <img src={'/img/onboarding-icons/' + template.icon} alt={template.displayName} className="w-12 h-12 mr-3" />
                        
                                    <div>
                                        <h3 className="text-lg font-semibold">{template.displayName}</h3>
                                        <div className="text-xs text-gray-600 dark:text-gray-500"><Markdown>{template.options?.welcomeMessage?.length > 80 ? template.options?.welcomeMessage.slice(0, 80)  : template.options?.welcomeMessage}</Markdown></div>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full text-sm" onClick={async (e) => {
                                    try {
                                        const newAgent = await agentContext.newFromTemplate(template)
                                        templateContext?.setTemplatePopupOpen(false);
                                        templateContext?.setOnboardingOpen(false);
                                        router.push(`/admin/agent/${newAgent.id}/general`);                                    
                                    } catch (e) {
                                        toast.error(t('Failed to create agent from template'));
                                    }

                                }}>
                                    {t('Use Template')}
                                    <ArrowRight className="w-3 h-3 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    </div>
                    </ScrollArea>
                <div className="text-center mt-6">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={(e) => {
                        templateContext?.setOnboardingOpen(false)
                        templateContext?.setTemplatePopupOpen(true)                        
                    }}>
                        {t('More templates ...')}
                        <Sparkles className="w-4 h-4 ml-2" />
                    </Button>
                </div>
                <div className="mt-2 text-center">
                        <Checkbox id="show-on-startup" defaultChecked={true} className="text-xs mr-2" onCheckedChange={(e) => {
                            localStorage.setItem('onboarding', (!!e).toString());
                        }} />
                        <label className="text-xs" htmlFor="show-on-startup">{t('Show this dialog on startup')}</label>
                    </div>

            </DialogContent>
        </Dialog>
    );
}