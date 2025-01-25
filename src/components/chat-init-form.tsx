import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import remarkGfm from 'remark-gfm';
import Markdown from "react-markdown"
import styles from './chat.module.css';
import { useForm, SubmitHandler } from "react-hook-form";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { ChatInitFormType, useChatContext } from "@/contexts/chat-context";
import { Credenza, CredenzaContent } from "./credenza";
import { useState } from "react";
import { ScrollArea } from "./ui/scroll-area";



export function ChatInitForm({ displayName, welcomeMessage }: { displayName: string; welcomeMessage: string }) {
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<ChatInitFormType>();
    const onSubmit: SubmitHandler<ChatInitFormType> = (data) => {
        //console.log(data);
        chatContext.saveInitForm(data);
        const response = chatContext.setInitFormDone(true);
        console.log(response);
    }
    const [openTerms, setOpenTerms] = useState(false);

    const chatContext = useChatContext();

    const {t} = useTranslation();

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>{displayName}</CardTitle>
            </CardHeader>
            <CardContent>
                <Credenza open={openTerms} onOpenChange={setOpenTerms}>
                    <CredenzaContent>
                        <ScrollArea className="h-[60vh] pr-4">
                            <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{chatContext.agent?.options?.termsAndConditions}</Markdown>
                        </ScrollArea>
                    </CredenzaContent>
                </Credenza>
                
                <div key='welcome-message' className={`mb-4 text-left`}>
                    <span className={`inline-block p-2 rounded-lg bg-muted`}>
                        <Markdown className={styles.markdown} remarkPlugins={[remarkGfm]}>{welcomeMessage}</Markdown>
                    </span>
                </div>
                <form onSubmit={handleSubmit(onSubmit)}>
                    {chatContext.agent?.options?.collectUserEmail ? (
                        <div>
                            <div className="mb-4">
                                <Label htmlFor="userName" className="block text-sm font-medium text-gray-700">{t('User Name')}</Label>
                                <Input
                                    id="userName"
                                    {...register("userName", { required: t("Name is required") })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                />
                                {errors.userName && <span className="text-red-500 text-sm">{errors.userName.message}</span>}
                            </div>
                            <div className="mb-4">
                                <Label htmlFor="userEmail" className="block text-sm font-medium text-gray-700">{t('User Email')}</Label>
                                <Input
                                    id="userEmail"
                                    type="email"
                                    {...register("userEmail", { required: t("Email is required") })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                />
                                {errors.userEmail && <span className="text-red-500 text-sm">{errors.userEmail.message}</span>}
                            </div>
                        </div>
                    ) : null}
                    {chatContext.agent?.options?.mustConfirmTerms ? (
                    <div className="mb-4">
                        <label htmlFor="acceptTerms" className="inline-flex items-center">
                            <Checkbox
                                value="true"
                                id="acceptTerms"
                                onCheckedChange={ (e) => setValue("acceptTerms", !!e)}
                                {...register("acceptTerms", { 
                                  validate: {
                                    acceptTerms: (value) => value === true
                                  }
                                })}
                                className="form-checkbox"
                            />
                            <span className="ml-2">{t('I accept the ')}<a className="underline" href="#" onClick={(e) => setOpenTerms(true)}>{t('terms and conditions')}</a></span>
                        </label>
                        {errors.acceptTerms && <span className="text-red-500 text-sm block">{errors.acceptTerms.message}</span>}
                    </div>
                    ) : null}
                    <Button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">{t('Go')}</Button>
                </form>
            </CardContent>
        </Card>
    );
}

