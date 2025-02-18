import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { DialogHeader } from "./ui/dialog";
import { useContext, useEffect, useState } from "react";
import { TemplateContext } from "@/contexts/template-context";
import { useTranslation } from "react-i18next";

export function OnboardingDialog() {

    const [onboardingOpen, setOnboardingOpen] = useState(false);
    const templateContext = useContext(TemplateContext);

    const { t } = useTranslation();

    useEffect(() => {
        if (localStorage.getItem('onboarding') === 'false') {
            setOnboardingOpen(false);
        } else {
            setOnboardingOpen(true);
        }
    }, []);

    return (
        <Dialog open={onboardingOpen} onOpenChange={(v) =>{
            setOnboardingOpen(v);
            localStorage.setItem('onboarding', v.toString());
        }}>
            <DialogContent className="sm:max-w-[600px] md:max-w-[800px] z-50 bg-background">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        <div className="flex-row h-40 w-40"><img src="/img/agent-doodle-logo.svg" /></div>
                        <h2 className="text-2xl font-bold text-gray-800">Welcome to Agent Doodle</h2>
                        <p className="text-sm text-gray-600 mt-2">Choose a template to get started</p>
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {templateContext?.templates.map((template, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                            <CardContent className="p-4">
                                <div className="flex items-center mb-3">
                                    <img src={'/img/onboarding-icons/' + template.icon} alt={template.displayName} className="w-12 h-12 mr-3" />
                        
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">{template.displayName}</h3>
                                        <p className="text-xs text-gray-600">{template.options?.welcomeMessage}</p>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full text-sm">
                                    {t('Use Template')}
                                    <ArrowRight className="w-3 h-3 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="text-center mt-6">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={(e) => {
                        setOnboardingOpen(false)
                        templateContext?.setTemplatePopupOpen(true)                        
                    }}>
                        {t('More templates ...')}
                        <Sparkles className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}