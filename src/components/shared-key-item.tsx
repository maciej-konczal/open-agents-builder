import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Key } from "@/data/client/models";
import { Button } from "./ui/button";
import { useContext } from "react";
import { KeyContext } from "@/contexts/key-context";
import { useTranslation } from "react-i18next";

export default function SharedKeyItem({ sharedKey, selected, onClick }: { sharedKey: Key, selected: boolean, onClick: (e: any) => void}) {
  const keysContext = useContext(KeyContext);
  const { t } = useTranslation();
  return (
    <Link
      className={`flex items-center gap-3 p-3 rounded-md ${selected ? " text-primary-foreground" : "" } transition-colors over:bg-secondary`}
      href=""
      onClick={onClick}
    >
      <div className="grid grid-cols-3 w-full">
        <div className="font-medium">{sharedKey.displayName}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('Expiry date:')} {sharedKey.expiryDate ? new Date(sharedKey.expiryDate as string).toLocaleString(): 'never'} {sharedKey.expiryDate && new Date(sharedKey.expiryDate as string).getTime() < Date.now() ? (<span className="text-red-500">{t('expired!')}</span>) : null}</div>
        <div className="text-sm items-end">
          <Button onClick={(e) => {
            keysContext.removeKey(sharedKey.keyLocatorHash);
          }}>{t('Revoke key')}</Button>
        </div>
      </div>
    </Link>
  );
}