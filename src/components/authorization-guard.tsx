'use client'
import { DatabaseContext, keepLoggedInKeyPassword } from '@/contexts/db-context';
import { DatabaseAuthStatus } from '@/data/client/models';
import React, { PropsWithChildren, useContext, useEffect, useState } from 'react';
import { AuthorizePopup } from './authorize-popup';
import { useEffectOnce } from 'react-use';
import { KeepLoggedinLoader } from './keep-loggedin-loader';
import { SharingPopup } from './sharing-popup';
import { useParams } from 'next/navigation';
import { EncryptionUtils } from '@/lib/crypto';

const AuthorizationGuard = ({ children } : {children: React.ReactNode | undefined }) => {
    const dbContext = useContext(DatabaseContext);
    const [keepLoggedIn, setKeepLoggedIn] = useState(typeof localStorage !== 'undefined' ? localStorage.getItem("keepLoggedIn") === "true" : false)
    const [autoLoginInProgress, setAutoLoginInProgress] = useState(false);
    const params = useParams();

    const [decodedEem, setDecodedEem] = useState<string>('');

    useEffectOnce(() => {
        if(keepLoggedIn) {
            const email = localStorage.getItem("email") as string;
            const key = localStorage.getItem("key") as string;
            setAutoLoginInProgress(true);
            const result = dbContext?.keepLoggedIn({
                encryptedDatabaseId: email,
                encryptedKey: key,
                keepLoggedIn: keepLoggedIn                
            }).then((result) => {
                    if(!result?.success) {
                        setKeepLoggedIn(false);
                    }
                    setAutoLoginInProgress(false);
                });
            }
        });

    return (dbContext?.authStatus === DatabaseAuthStatus.Authorized) ? (
        <>{children}</>) : (params.databaseIdHash && params.eem ? <SharingPopup eem={params.eem} databaseIdHash={params.databaseIdHash as string}  autoLoginInProgress={autoLoginInProgress} /> : <AuthorizePopup autoLoginInProgress={autoLoginInProgress} />);
};

export default AuthorizationGuard;