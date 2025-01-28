"use client"

import { useContext, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ChangeKeyForm } from './change-key-form';
import { Credenza, CredenzaContent } from './credenza';
import { KeyContext } from '@/contexts/key-context';

export function ChangeKeyPopup({}) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = (theme === 'system' ? systemTheme : theme)
  const keysContext = useContext(KeyContext);

  useEffect(() => {
  },[]);

  return (
    <Credenza open={keysContext?.changePasswordDialogOpen} onOpenChange={keysContext?.setChangePasswordDialogOpen}>
      <CredenzaContent className="sm:max-w-[425px] bg-background">
        <div className="p-4 grid items-center justify-center">
          <ChangeKeyForm />
        </div>
      </CredenzaContent>
    </Credenza>
  )
}