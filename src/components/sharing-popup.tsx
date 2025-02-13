"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader } from "./ui/card";
import { AuthorizeDatabaseForm } from "./authorize-database-form";
import { CreateDatabaseForm } from "./create-database-form";
import { Suspense, useContext, useEffect, useState } from 'react';
import DataLoader from './data-loader';
import { useTheme } from 'next-themes';
import { SaaSContext } from '@/contexts/saas-context';
import { CookieConsentBannerComponent } from '@/components/cookie-consent-banner';
import { SaaSContextLoader } from './saas-context-loader';
import FeedbackWidget from './feedback-widget';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

export function SharingPopup({ autoLoginInProgress }: { autoLoginInProgress: boolean }) {
  const [applicationLoaded, setApplicationLoaded] = useState(false);
  const { theme, systemTheme } = useTheme();
  const { t } = useTranslation();
  const currentTheme = (theme === 'system' ? systemTheme : theme)
  const saasContext = useContext(SaaSContext);
  const [currentTab, setCurrentTab] = useState('authorize');
  const { i18n } = useTranslation();

  const router = useRouter();

  useEffect(() => {
    setApplicationLoaded(true);
  },[]);

  useEffect(() => {
    if (saasContext?.email) {
      const defaultTab = saasContext?.email && ((saasContext?.currentUsage !== null ? saasContext.currentUsage.usedDatabases : 0) > 0) ? `authorize` : `create`;
      setCurrentTab(defaultTab);
    }
  }, [saasContext?.email]);
  return (
    <div className="p-4 grid items-center justify-center h-screen">
     {!applicationLoaded || autoLoginInProgress ? (<div className="w-96 flex items-center justify-center flex-col"><div className="flex-row h-40 w-40"><img src="/img/agent-doodle-logo.svg" /></div><div><DataLoader /></div></div>):(
      <div>
        <div id="language-selector">
          <button className="text-xs m-2" onClick={() => i18n.changeLanguage('en')}>🇺🇸 English</button>
          <button className="text-xs m-2" onClick={() => i18n.changeLanguage('pl')}>🇵🇱 Polski</button>
        </div>
      </div>)}
      <CookieConsentBannerComponent />
     </div>
  )
}