'use client'
import { DatabaseContext } from '@/contexts/db-context';
import { DatabaseAuthStatus } from '@/data/client/models';
import React, { PropsWithChildren, useContext, useState } from 'react';
import { AuthorizePopup } from './authorize-popup';
import { useEffectOnce } from 'react-use';
import { KeepLoggedinLoader } from './keep-loggedin-loader';
import { SharingPopup } from './sharing-popup';

const AuthorizationGuard = ({ children, sharingView, email, databaseIdHash } : {children: React.ReactNode | undefined, sharingView?: boolean, email?: string, databaseIdHash?: string}) => {
    const dbContext = useContext(DatabaseContext);
    const [keepLoggedIn, setKeepLoggedIn] = useState(typeof localStorage !== 'undefined' ? localStorage.getItem("keepLoggedIn") === "true" : false)
    const [autoLoginInProgress, setAutoLoginInProgress] = useState(false);

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
        <>{children}</>) : (sharingView ? <SharingPopup autoLoginInProgress={autoLoginInProgress} /> : <AuthorizePopup autoLoginInProgress={autoLoginInProgress} />);
};

export default AuthorizationGuard;