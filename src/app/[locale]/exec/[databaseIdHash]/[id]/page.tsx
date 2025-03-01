'use client'

import { AIConsentBannerComponent } from "@/components/ai-consent-banner";
import { Chat } from "@/components/chat";
import { ChatInitForm } from "@/components/chat-init-form";
import { CookieConsentBannerComponent } from "@/components/cookie-consent-banner";
import DataLoader from "@/components/data-loader";
import FeedbackWidget from "@/components/feedback-widget";
import { useExecContext } from "@/contexts/chat-context";
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
    const chatContext = useExecContext();
    const { t } = useTranslation();

    useEffect(() => {
      // TODO: add Exec context similar to chat context
        // chatContext.init(params.id, params.databaseIdHash, params.locale, nanoid() /** generate session id */).catch((e) => {
        //   console.error(e);
        //   setGeneralError(t(getErrorMessage(e)));
        // }).then(() => {
        //   setIsInitializing(false);
        // });
    }, [params.id, params.databaseIdHash, params.locale]);

    // useEffect(() => {
    //     if (chatContext.agent){
    //     }
    //   }, [chatContext.agent, chatContext.initFormRequired, chatContext.initFormDone]);

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
            <div>Input forms</div>
          )
        )}
        <FeedbackWidget />
        <CookieConsentBannerComponent />
        </div>
      </div>
    )
}