'use client'

import { AIConsentBannerComponent } from "@/components/ai-consent-banner";
import AuthorizationGuard from "@/components/authorization-guard";
import { Chat } from "@/components/chat";
import { ChatInitForm } from "@/components/chat-init-form";
import { CookieConsentBannerComponent } from "@/components/cookie-consent-banner";
import DataLoader from "@/components/data-loader";
import FeedbackWidget from "@/components/feedback-widget";
import { DatabaseContextProvider } from "@/contexts/db-context";
import { useExecContext } from "@/contexts/exec-context";
import { SaaSContextProvider } from "@/contexts/saas-context";
import { getErrorMessage } from "@/lib/utils";
import { useChat } from "ai/react";
import moment from "moment";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function ExecPage({children,
    params,
  }: {
    children: React.ReactNode;
    params: { id: string, databaseIdHash: string, locale: string };
  }) {
    const [isInitializing, setIsInitializing] = useState(true);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const execContext = useExecContext();
    const { t } = useTranslation();

    useEffect(() => {
      // TODO: add Exec context similar to chat context
         execContext.init(params.id, params.databaseIdHash, params.locale, nanoid() /** generate session id */).catch((e) => {
           console.error(e);
           setGeneralError(t(getErrorMessage(e)));
         }).then(() => {
           setIsInitializing(false);
         });
    }, [params.id, params.databaseIdHash, params.locale]);

    // useEffect(() => {
    //     if (execContext.agent){
    //     }
    //   }, [execContext.agent, execContext.initFormRequired, execContext.initFormDone]);


    const authorizedExec = () => {
      return (

        (execContext.initFormRequired && !execContext.initFormDone) ? (
          <ChatInitForm
              welcomeMessage={execContext.agent?.options?.welcomeMessage ?? ''}
            displayName={execContext.agent?.displayName ?? ''}
          />
      ):(
        <div>
          Exec form ...
        </div>
      ))
    }

    return (
      <div>
        <AIConsentBannerComponent />
        <div className="pt-10">
          {isInitializing ? (
            <div className="text-center">
              <div className="flex justify-center m-4"><DataLoader /></div>
              <div className="text-gray-500 text-center">{t("Initializing agent...")}</div>
            </div>
          ) : (
          generalError ? (
            <div className="text-center">
              <div className="flex justify-center m-4 text-red-400 text-2xl">{t('Error')}</div>
              <div className="text-red-500 text-center">{generalError}</div>
            </div>
          ): (
            execContext.agent?.published ? (
              authorizedExec()
          ) : (
                <DatabaseContextProvider>
                  <SaaSContextProvider>
                    <AuthorizationGuard>
                      {authorizedExec()}
                    </AuthorizationGuard>
                  </SaaSContextProvider>
                </DatabaseContextProvider>
          )
        ))}
        <FeedbackWidget />
        <CookieConsentBannerComponent />
        </div>
      </div>
    )
}