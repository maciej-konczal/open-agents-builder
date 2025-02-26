'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useTranslation } from 'react-i18next'

export function AIConsentBannerComponent() {
  const [showBanner, setShowBanner] = useState(false)

  const { t } = useTranslation()

  useEffect(() => {
    const consentChoice = localStorage.getItem('aiConsent')
    if (!consentChoice) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('aiConsent', 'accepted')
    setShowBanner(false)
    // we're not storing the consent in DB because its probably shown before user is logged in so we're not sure which database to store the term in
    // Enable cookies or tracking scripts here
  }

  const handleDecline = () => {
    localStorage.setItem('aiConsent', 'declined')
    setShowBanner(false)
    // Disable non-essential cookies or tracking here
  }

  if (!showBanner) return null

  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 md:flex md:items-center md:justify-between shadow-lg" role="alert" aria-live="polite">
      <div className="mb-4 md:mb-0 md:mr-4 flex-grow">
        <p className="text-sm light:text-gray-900 dark:text-gray-300 dark:text-gray-300">
          {t('You are about to use an ')}<strong>{t('AI Driven Chatbot')}</strong>{t('. Please be aware that your messages will be processed by Open AI (our AI data provider) in accordance with our ')}<a href="/content/privacy" className="text-primary hover:underline">{t('Privacy Policy')}</a>. <strong>{t('AI may be wrong')}</strong>. {t('Your messagess will be available to and processed by the person/company who created this particular Agent.')}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <Button onClick={handleAccept} variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
          {t('Accept')}
        </Button>
      </div>
      <button 
        onClick={handleDecline} 
        className="absolute top-2 right-2 text-gray-500 hover:light:text-gray-900 dark:text-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
        aria-label="Close AI consent banner"
      >
      </button>
    </div>
  )
}