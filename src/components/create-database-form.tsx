"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form";
import {  passwordValidator } from "@/data/client/models";
import { PasswordInput } from "./ui/password-input";
import { ReactElement, use, useContext, useEffect, useState } from "react"
import { Checkbox } from "./ui/checkbox";
import NoSSR  from "react-no-ssr"
import { CreateDatabaseResult, DatabaseContext } from "@/contexts/db-context";
import { generatePassword } from "@/lib/crypto";
import { CopyIcon, EyeIcon, EyeOffIcon, PrinterIcon, WandIcon } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "./ui/textarea";
import Link from 'next/link';
import { useTranslation } from "react-i18next";

const termsUrl = process.env.NEXT_PUBLIC_TERMS_URL ?? '/content/terms';
const privacyUrl = process.env.NEXT_PUBLIC_PRIVACY_URL ?? '/content/privacy';


interface CreateDatabaseFormProps {
}

export function CreateDatabaseForm({  
}: CreateDatabaseFormProps) {
  const { register, setValue, getValues, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: generatePassword(),
      acceptTerms: false
    }
  });

  const [operationResult, setOperationResult] = useState<CreateDatabaseResult | null>(null);
  const [showPassword, setShowPassword] = useState(false)
  const [printKey, setPrintKey] = useState<ReactElement | null>(null);
  const [keepLoggedIn, setKeepLoggedIn] = useState(typeof localStorage !== 'undefined' ? localStorage.getItem("keepLoggedIn") === "true" : false)
  const dbContext = useContext(DatabaseContext);
  const { t, i18n } = useTranslation();

  useEffect(() => { 
    setOperationResult(null);
    // TODO: load credentials from local storage
  }, []);
  const handleCreateDatabase = handleSubmit(async (data) => {
    // Handle form submission
    const result = await dbContext?.create({
      email: data.email,
      key: data.password,
      language: i18n.language,
    });

    setOperationResult(result ?? null);
    if(result?.success) {
      toast.success(t(result?.message));
    } else {
      toast.error(result?.message ? t(result?.message) : t('Error occured'));
    }
  });

  if (operationResult?.success) {
    return (<div className="flex flex-col space-y-2 gap-2 mb-4">
      <h2 className="text-green-500 text-bold">{t('Congratulations!')}</h2>
      <p className="text-sm">{t('Your account has ben successfully created. Please store the credentials in safe place.')}</p>
      <div className="border-2 border-dashed border-green-400 p-5">
        <div className="text-sm mb-5">
          <Label htmlFor="email">{t('Email:')}</Label>
          <Input id="email" readOnly value={dbContext?.email} />
        </div>
        <div className="text-sm">
          <Label htmlFor="password">{t('Password:')}</Label>
          <Textarea id="password" readOnly value={dbContext?.password} />
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="p-1 h-10 p-2" onClick={async (e) => {
            e.preventDefault();
            const textToCopy = t('Email: ') + dbContext?.email + "\""+ t('Password: ') + dbContext?.password;
            if ('clipboard' in navigator) {
              navigator.clipboard.writeText(textToCopy);
            } else {
              document.execCommand('copy', true, textToCopy);
            }                
          }}><CopyIcon className="w-4 h-4" /> {t('Copy to clipboard')}</Button>             
        </div>
      </div>


      <Button onClick={() => {
        setOperationResult(null);
        dbContext?.authorize({ // this will authorize the database and in a side effect close this popup
          email: dbContext?.email,
          key: dbContext?.password,
          keepLoggedIn: keepLoggedIn
        });
      }}>{t('Go to application')}</Button>
    </div>)
  } else  {
    return (
      <form onSubmit={handleCreateDatabase}>
        <div className="flex flex-col space-y-2 gap-2 mb-4">
          {operationResult ? (
            <div>
              <p className={operationResult.success ? "p-3 border-2 border-green-500 background-green-200 text-sm font-semibold text-green-500" : "background-red-200 p-3 border-red-500 border-2 text-sm font-semibold text-red-500"}>{t(operationResult.message)}</p>
            </div>
          ) : null}
          <Label htmlFor="email">{t('E-mail')}</Label>
          <Input autoFocus 
            type="text"
            id="email"
            {...register("email", { required: true,
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: t("Entered value does not match email format")
              }            
              })}
          />
          {errors.email && <span className="text-red-500 text-sm">{t('E-mail must be a valid e-mail address and unique')}</span>}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('Please enter your e-email adress which let us create an account and a database for You.')}
          </p>        

        </div>
        <div className="flex flex-col space-y-2 gap-2 mb-4">
              <Label htmlFor="key">{t('Password')}</Label>
              <div className="flex gap-2">
                <div className="relative">
                  <PasswordInput autoComplete="new-password" id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register("password", { required: true,
                          validate: {
                              key: passwordValidator
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
                <Button variant="outline" className="p-1 h-10 w-10" onClick={(e) => {
                  e.preventDefault();
                  setValue('password', generatePassword());
                  setShowPassword(true);
                }}><WandIcon className="w-4 h-4" /></Button>
                <Button variant="outline" className="p-1 h-10 w-10" onClick={async (e) => {
                  e.preventDefault();
                  const textToCopy = t('E-mail: ') + getValues().email + "\n" + t('Password: ') + getValues().password;
                  if ('clipboard' in navigator) {
                    navigator.clipboard.writeText(textToCopy);
                  } else {
                    document.execCommand('copy', true, textToCopy);
                  }                
                }}><CopyIcon className="w-4 h-4" /></Button>              
              </div>
              <div>
                {printKey}
              </div>
              {errors.password && <span className="text-red-500 text-sm">{t('Password must be at least 8 characters length including digits, alpha, lower and upper letters.')}</span>}
        </div>
        <div className="text-sm justify-between gap-4 mt-4">
          <Checkbox
            className="mr-2"
            id="acceptTerms"
            value="true"
            onCheckedChange={ (e) => setValue("acceptTerms", !!e)}
            {...register("acceptTerms", { 
              validate: {
                acceptTerms: (value) => value === true
              }
            })}             
             />
          <Label htmlFor="acceptTerms">
            {t('I hereby accept Agent Doodle ')}<Link target="_blank" className="underline hover:text-blue-500" href={termsUrl}>{t('Terms of Service')}</Link>{t(' and ')}<Link target="_blank"  className="underline hover:text-blue-500" href={privacyUrl}>{t('Privacy Policy')}</Link>.
          </Label>
          {errors.acceptTerms && <p className="text-red-500 text-sm">{t('Please read and accept terms of service and privacy policy.')}</p>}
        </div>
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
              <Button type="submit">{t('Create account')}</Button>
          </div>
        </div>
      </form>
    );
  }
}
