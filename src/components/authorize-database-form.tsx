"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form";
import { Checkbox } from "./ui/checkbox";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { PasswordInput } from "./ui/password-input";
import NoSSR  from "react-no-ssr"
import { AuthorizeDatabaseResult, DatabaseContext } from "@/contexts/db-context";
import { toast } from "sonner";
import { useEffectOnce } from "react-use";
import Link from "next/link";
import { passwordValidator } from "@/data/client/models";
import { useTranslation } from "react-i18next";

const termsUrl = process.env.NEXT_PUBLIC_TERMS_URL ?? '/content/terms';
const privacyUrl = process.env.NEXT_PUBLIC_PRIVACY_URL ?? '/content/privacy';

interface AuthorizeDatabaseFormProps {
}

export function AuthorizeDatabaseForm({
}: AuthorizeDatabaseFormProps) {
  const [operationResult, setOperationResult] = useState<AuthorizeDatabaseResult | null>(null);

  const { t, i18n } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(typeof localStorage !== 'undefined' ? localStorage.getItem("keepLoggedIn") === "true" : false)
  const dbContext = useContext(DatabaseContext);

  useEffectOnce(() => { // TODO: load credentials from local storage
    setOperationResult(null);
  });
  
  const handleAuthorizeDatabase = handleSubmit(async (data) => {
    const result = await dbContext?.authorize({
      email: data.email,
      key: data.password,
      keepLoggedIn: keepLoggedIn
    });
    
    setOperationResult(result as AuthorizeDatabaseResult);
    if(result?.success) {
      toast.success(result?.message ? t(result?.message) : t('Success'));
    } else {
      toast.error(result?.message ? t(result?.message) : t('An error occurred'));
    }    
  });

  return (
    <form onSubmit={handleAuthorizeDatabase}>
      <div className="flex flex-col space-y-2 gap-2 mb-4">
        {operationResult ? (
          <div>
            <p className={operationResult.success ? "p-3 border-2 border-green-500 background-green-200 text-sm font-semibold text-green-500" : "background-red-200 p-3 border-red-500 border-2 text-sm font-semibold text-red-500"}>{t(operationResult.message)}</p>
            <ul>
              {operationResult.issues.map((issue, index) => (
                <li key={index}>{t(issue.message)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <Label htmlFor="email">E-mail</Label>
        <Input
          type="text"
          id="email"
          {...register("email", { required: true,
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: t("Entered value does not match email format")
            }            
           })}
        />
        {errors.email && <span className="text-red-500 text-sm">{t('E-mail must be a valid email address')}</span>}
      </div>
      <div className="flex flex-col space-y-2 gap-2 mb-4">
        <Label htmlFor="password">{t('Password')}</Label>
            <div className="relative">
            <PasswordInput autoComplete="current-password webauthn" id="password"
                type={showPassword ? 'text' : 'password'}
                {...register("password", { required: true,
                    validate: {
                        password: passwordValidator
                    }            
                    })}                        />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent z-0"
                    onClick={() => setShowPassword((prev) => !prev)}
                >
                    {showPassword ? (
                    <EyeIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                    />
                    ) : (
                    <EyeOffIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                    />
                    )}
                    <span className="sr-only">
                    {showPassword ? t("Hide password") : t("Show password")}
                    </span>
                </Button>

                {/* hides browsers password toggles */}
                <style>{`
                    .hide-password-toggle::-ms-reveal,
                    .hide-password-toggle::-ms-clear {
                    visibility: hidden;
                    pointer-events: none;
                    display: none;
                    }
                `}</style>
                </div>
        {errors.password && <span className="text-red-500 text-sm">{t('Password must be at least 8 characters length including digits, alpha, lower and upper letters.')}</span>}
        </div>
        {termsUrl ? (
          <div className="items-center justify-between gap-4 mt-4 text-sm">
           {t('Logging in you accept Open Agents Builder ')}<Link className="underline hover:text-blue-500" target="_blank"  href={termsUrl + (i18n.language === 'pl' ? '-pl' : '')}>{t('Terms of Service')}</Link>{t(' and ')}<Link className="underline hover:text-blue-500" target="_blank"  href={privacyUrl+ (i18n.language === 'pl' ? '-pl' : '')}>{t('Privacy Policy')}</Link>.
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 mt-4">
            <NoSSR>
              <div className="flex items-center gap-2">
                  <Checkbox
                      id="keepLoggedIn"
                      checked={keepLoggedIn}
                      onCheckedChange={(checked) => {
                      setKeepLoggedIn(!!checked);
                      localStorage.setItem("keepLoggedIn", checked.toString());
                    }}
                  />
                  <label htmlFor="keepLoggedIn" className="text-sm">{t('Keep me logged in')}</label>
              </div>      
            </NoSSR>
            <div className="items-center flex justify-center">
                <Button type="submit">{t('Log in!')}</Button>
            </div>
        </div>
    </form>
  );
}