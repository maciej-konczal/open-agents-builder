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
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthorizePopup({ autoLoginInProgress }: { autoLoginInProgress: boolean }) {
  const [applicationLoaded, setApplicationLoaded] = useState(false);
  const { theme, systemTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const currentTheme = (theme === 'system' ? systemTheme : theme)
  const saasContext = useContext(SaaSContext);
  const [currentTab, setCurrentTab] = useState('authorize');

  const searchParams = useSearchParams();

  const router = useRouter();

  useEffect(() => {
    setApplicationLoaded(true);
  },[]);

  useEffect(() => {
    if (saasContext?.userId) {
      const defaultTab = searchParams.get('tab') === 'create' ? 'create' : 'authorize';
      setCurrentTab(defaultTab);
    }
  }, [saasContext?.userId]);
  return (
    <div className="p-4 grid items-center justify-center h-screen">
     {!applicationLoaded || autoLoginInProgress ? (<div className="w-96 flex items-center justify-center flex-col"><div className="flex-row h-40 w-40"><img src="/img/agent-doodle-logo.svg" /></div><div><DataLoader /></div></div>):(
      <div>
        <Suspense fallback={<div>{t('Loading SaaSContext...')}</div>}>
          <SaaSContextLoader />
        </Suspense>
        <FeedbackWidget />
        {saasContext?.userId ? (
          <div className="text-xs w-96 p-3 border-2 border-green-500 background-green-200 text-sm font-semibold text-green-500">
            {t('Hello')}{t('! Welcome to Agent Doodle. Read ')}<a className="underline" target="_blank" href={"/content/terms" + (i18n.language === 'pl' ? '-pl' : '') }>terms</a>{t(' and ')}<a className="underline" target="_blank" href={"/content/privacy" + (i18n.language === 'pl' ? '-pl' : '') }>{t('privacy')}</a>{t(' before using the app.')}
          </div>
        ): (null)}
        
        <div className="flex">
          <img alt="Application logo" className="w-16 mr-5" src={currentTheme === 'dark' ? `/img/agent-doodle-logo-white.svg` : `/img/agent-doodle-logo.svg`} />
          <h1 className="text-5xl text-center p-8 pl-0">{t('Agent Doodle')}</h1>
        </div>
        <Tabs defaultValue="authorize" value={currentTab} onValueChange={(value) => setCurrentTab(value)} className="w-96">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="authorize" className="dark:data-[state=active]:bg-zinc-900 data-[state=active]:bg-zinc-100 data-[state=active]:text-gray-200">{t('Log in')}</TabsTrigger>
            <TabsTrigger value="create" className="dark:data-[state=active]:bg-zinc-900 data-[state=active]:bg-zinc-100 data-[state=active]:text-gray-200">{t('Create account')}</TabsTrigger>
          </TabsList>
          <TabsContent value="authorize" className="max-w-600">
            <Card>
              <CardHeader>
              </CardHeader>
              <CardContent className="space-y-2">
                <AuthorizeDatabaseForm />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="create">
            <Card>
              <CardHeader>
              </CardHeader>
              <CardContent className="space-y-2">
                <CreateDatabaseForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div id="language-selector">
          <button className="text-xs m-2" onClick={() => i18n.changeLanguage('en')}>🇺🇸 English</button>
          <button className="text-xs m-2" onClick={() => i18n.changeLanguage('pl')}>🇵🇱 Polski</button>
        </div>
      </div>
        )}
      <CookieConsentBannerComponent />
    </div>
  )
}