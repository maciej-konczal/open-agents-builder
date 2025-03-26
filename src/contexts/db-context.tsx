import React, { createContext, useState,  PropsWithChildren, useContext } from 'react';
import { KeyHashParamsDTO } from '@/data/dto';
import { DatabaseAuthorizeRequest, DatabaseAuthStatus, DatabaseCreateRequest, DatabaseKeepLoggedInRequest, DatabaseRefreshRequest, KeyACL } from '@/data/client/models';
import { AuthorizeDbResponse, DbApiClient, RefreshDbResponse } from '@/data/client/db-api-client';
import { ConfigContextType } from '@/contexts/config-context';
import { EncryptionUtils, generatePassword, sha256 } from '@/lib/crypto';
import { toast } from 'sonner';
import { ZodIssue } from 'zod';
import { SaaSContext } from './saas-context';
import { useTranslation } from 'react-i18next';
const argon2 = require("argon2-browser");

// the salts are static as they're used as record locators in the DB - once changed the whole DB needs to be re-hashed
// note: these salts ARE NOT used to hash passwords etc. (for this purpose we generate a dynamic per-user-key hash - below)
export const defaultDatabaseIdHashSalt = process.env.NEXT_PUBLIC_DATABASE_ID_HASH_SALT || 'ooph9uD4cohN9Eechog0nohzoon9ahra';
export const defaultKeyLocatorHashSalt = process.env.NEXT_PUBLIC_KEY_LOCATOR_HASH_SALT || 'daiv2aez4thiewaegahyohNgaeFe2aij';
export const keepLoggedInKeyPassword = process.env.NEXT_PUBLIC_KEEP_LOGGED_IN_KEY_ENCRYPTION_KEY || 'aeghah9eeghah9eeghah9eeghah9eegh';

export type AuthorizeDatabaseResult = {
    success: boolean;
    message: string;
    issues: ZodIssue[];
}

export type RefreshDatabaseResult = {
    success: boolean;
    message: string;
    issues: ZodIssue[];
    accessToken?: string;
}

export type CreateDatabaseResult = {
    success: boolean;
    message: string;
    issues: ZodIssue[];
}

export type DatabaseContextType = {

    email: string;
    setDatabaseId: (hashId: string) => void;
    masterKey: string;
    setMasterKey: (key: string) => void;
    password: string;
    setPassword: (key: string) => void; 

    acl: KeyACL | null;
    setACL: (acl: KeyACL | null) => void;


    databaseIdHash: string;
    setDatabaseIdHash: (hashId: string) => void;
    keyLocatorHash: string;
    setKeyLocatorHash: (hash: string) => void;

    keyHash: string;
    setKeyHash: (hash: string) => void;

    keyHashParams: KeyHashParamsDTO;
    setKeyHashParams: (params: KeyHashParamsDTO) => void;

    accessToken: string;
    setAccesToken: (hash: string) => void;

    refreshToken: string;
    setRefreshToken: (hash: string) => void;

    authStatus: DatabaseAuthStatus;
    setAuthStatus: (status: DatabaseAuthStatus) => void;

    create: (createRequest:DatabaseCreateRequest) => Promise<CreateDatabaseResult>;
    authorize: (authorizeRequest:DatabaseAuthorizeRequest) => Promise<AuthorizeDatabaseResult>;
    refresh: (authorizeRequest:DatabaseRefreshRequest) => Promise<RefreshDatabaseResult>;
    keepLoggedIn: (kliReqest: DatabaseKeepLoggedInRequest) => Promise<AuthorizeDatabaseResult>;

    logout: () => void;

    featureFlags: {
        [key: string]: boolean
    }
}

export const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const DatabaseContextProvider: React.FC<PropsWithChildren> = ({ children }) => {

    const [email, setDatabaseId] = useState<string>('');
    const [masterKey, setMasterKey] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    const [featureFlags, setFeatureFlags] = useState<{[key: string]: boolean}>({
        voiceRecorder: !!process.env.NEXT_PUBLIC_FEATURE_VOICE_RECORDER
    });

    const [acl, setACL] = useState<KeyACL|null>(null);
    const [databaseIdHash, setDatabaseIdHash] = useState<string>('');
    const [keyLocatorHash, setKeyLocatorHash] = useState<string>('');
    const [keyHash, setKeyHash] = useState<string>('');
    const [keyHashParams, setKeyHashParams] = useState<KeyHashParamsDTO>({
        hashLen: 0,
        salt: '',
        time: 0,
        mem: 0,
        parallelism: 1
    });

    const [accessToken, setAccesToken] = useState<string>('');
    const [refreshToken, setRefreshToken] = useState<string>('');
    const [authStatus, setAuthStatus] = useState<DatabaseAuthStatus>(DatabaseAuthStatus.NotAuthorized);
    const saasContext = useContext(SaaSContext);
    const { t } = useTranslation();

    const setupApiClient = async (config: ConfigContextType | null) => {
        const client = new DbApiClient('');
        return client;
    }
    const create = async (createRequest: DatabaseCreateRequest): Promise<CreateDatabaseResult> => {
        // Implement UC01 hashing and encryption according to https://github.com/CatchTheTornado/doctor-dok/issues/65

        const keyHashParams = {
            salt: generatePassword(),
            time: 2,
            mem: 16 * 1024,
            hashLen: 32,
            parallelism: 1
        } 
        const keyHash = await argon2.hash({
          pass: createRequest.key,
          salt: keyHashParams.salt,
          time: keyHashParams.time,
          mem: keyHashParams.mem,
          hashLen: keyHashParams.hashLen,
          parallelism: keyHashParams.parallelism
        });
        const databaseIdHash = await sha256(createRequest.email, defaultDatabaseIdHashSalt);
        const keyLocatorHash = await sha256(createRequest.key + createRequest.email, defaultKeyLocatorHashSalt);

        const encryptionUtils = new EncryptionUtils(createRequest.key);
        const masterKey = generatePassword()
        const encryptedMasterKey = await encryptionUtils.encrypt(masterKey);
        
        const apiClient = await setupApiClient(null);
        apiClient.setSaasToken(localStorage.getItem('saasToken') || '');
        const apiRequest = {
            email: createRequest.email,
            language: createRequest.language,
            databaseIdHash,
            encryptedMasterKey,
            keyHash: keyHash.encoded,
            keyHashParams: JSON.stringify(keyHashParams),
            keyLocatorHash,
        };
        const apiResponse = await apiClient.create(apiRequest);

        if(apiResponse.status === 200) { // user is virtually logged in
            setDatabaseIdHash(databaseIdHash);
            setDatabaseId(createRequest.email);
            setKeyLocatorHash(keyLocatorHash);
            setKeyHash(keyHash.encoded);
            setKeyHashParams(keyHashParams);
            setMasterKey(masterKey.trim());
            setPassword(createRequest.key);
            
            if (apiResponse.data.saasContext) {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('saasToken', apiResponse.data.saasContext.saasToken);
                }
            }
        }

        return {
            success: apiResponse.status === 200,
            message: t(apiResponse.message),
            issues: apiResponse.issues ? apiResponse.issues : []
        }
    };

    const logout = () => {
        setDatabaseId('');
        setACL(null);
        setMasterKey('');
        setPassword('');
        setDatabaseIdHash('');
        setKeyLocatorHash('');
        setKeyHash('');
        setKeyHashParams({
            hashLen: 0,
            salt: '',
            time: 0,
            mem: 0,
            parallelism: 1
        });
        setAccesToken(''); // we're not clearing keep logged in token
        setRefreshToken('');
        setAuthStatus(DatabaseAuthStatus.NotAuthorized);

        disableKeepLoggedIn();
    };

    const refresh = async (refreshRequest: DatabaseRefreshRequest): Promise<RefreshDatabaseResult> => {
        const apiClient = await setupApiClient(null);
        const apiResponse = await apiClient.refresh({
            refreshToken: refreshRequest.refreshToken
        });

        if(apiResponse.status === 200) { // user is virtually logged in
            setAccesToken((apiResponse as RefreshDbResponse).data.accessToken);
            setRefreshToken((apiResponse as RefreshDbResponse).data.refreshToken);

            setAuthStatus(DatabaseAuthStatus.Authorized);
            return {
                success: true,
                accessToken: (apiResponse as RefreshDbResponse).data.accessToken,
                message: t(apiResponse.message),
                issues: apiResponse.issues ? apiResponse.issues : []
            }
        } else {
            toast.error(t('Error refreshing the session. Please log in again.'));
            setAuthStatus(DatabaseAuthStatus.NotAuthorized);
            logout();
            return {
                success: false,
                message: t(apiResponse.message),
                issues: apiResponse.issues ? apiResponse.issues : []
            }
        }
    };

    const keepLoggedIn = async (kliReqest: DatabaseKeepLoggedInRequest): Promise<AuthorizeDatabaseResult> => {
        const encryptionUtils = new EncryptionUtils(keepLoggedInKeyPassword);
        return authorize({
            email: await encryptionUtils.decrypt(kliReqest.encryptedDatabaseId),
            key: await encryptionUtils.decrypt(kliReqest.encryptedKey),
            keepLoggedIn: kliReqest.keepLoggedIn
        });
    }

    const disableKeepLoggedIn = () => {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('key');
            sessionStorage.removeItem('email');
        }
        if(typeof localStorage !== 'undefined') {
            localStorage.setItem('keepLoggedIn', 'false');
            localStorage.removeItem('key');
            localStorage.removeItem('email');
        }        
    }

    const authorize = async (authorizeRequest: DatabaseAuthorizeRequest): Promise<AuthorizeDatabaseResult> => {
        setAuthStatus(DatabaseAuthStatus.InProgress);
        const databaseIdHash = await sha256(authorizeRequest.email, defaultDatabaseIdHashSalt);
        const keyLocatorHash = await sha256(authorizeRequest.key + authorizeRequest.email, defaultKeyLocatorHashSalt);
        const apiClient = await setupApiClient(null);

        const authChallengResponse = await apiClient.authorizeChallenge({
            databaseIdHash,
            keyLocatorHash
        });
        
        if (authChallengResponse.status === 200){ // authorization challenge success
            const keyHashParams = authChallengResponse.data as KeyHashParamsDTO;
            const keyHash = await argon2.hash({
                pass: authorizeRequest.key,
                salt: keyHashParams.salt,
                time: keyHashParams.time,
                mem: keyHashParams.mem,
                hashLen: keyHashParams.hashLen,
                parallelism: keyHashParams.parallelism
              });

            const authResponse = await apiClient.authorize({
                databaseIdHash,
                keyHash: keyHash.encoded,
                keyLocatorHash
            });

            if(authResponse.status === 200) { // user is virtually logged in
                const encryptionUtils = new EncryptionUtils(authorizeRequest.key);

                if (authResponse.data.saasContext) {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('saasToken', authResponse.data.saasContext.saasToken);
                    }
                }

                setDatabaseIdHash(databaseIdHash);
                setDatabaseId(authorizeRequest.email);
                setKeyLocatorHash(keyLocatorHash);
                setKeyHash(keyHash.encoded);
                setKeyHashParams(keyHashParams);

                const encryptedMasterKey = (authResponse as AuthorizeDbResponse).data.encryptedMasterKey;
                setMasterKey((await encryptionUtils.decrypt(encryptedMasterKey)).trim());
                setPassword(authorizeRequest.key);

                setAccesToken((authResponse as AuthorizeDbResponse).data.accessToken);
                setRefreshToken((authResponse as AuthorizeDbResponse).data.refreshToken);
                setAuthStatus(DatabaseAuthStatus.Authorized);

                const kliEncryptionUtils = new EncryptionUtils(keepLoggedInKeyPassword);
                const kliKey = await kliEncryptionUtils.encrypt(authorizeRequest.key);
                const kliEmail = await kliEncryptionUtils.encrypt(authorizeRequest.email)

                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('key', kliKey);
                    sessionStorage.setItem('email', kliEmail);

                }

                if(typeof localStorage !== 'undefined') {
                    localStorage.setItem('keepLoggedIn', (authorizeRequest.keepLoggedIn ? 'true' : 'false'));
                    if (authorizeRequest.keepLoggedIn) {
                        localStorage.setItem('key', kliKey);
                        localStorage.setItem('email', kliEmail);
                    }
                }

                const aclDTO = (authResponse as AuthorizeDbResponse).data.acl;
                if(aclDTO) {
                    console.log('Setting ACL: ', aclDTO);
                    setACL(new KeyACL(aclDTO));
                } else {
                    setACL(null);
                }
                return {
                    success: true,
                    message: t(authResponse.message),
                    issues: authResponse.issues ? authResponse.issues : []
                }

            } else {
                disableKeepLoggedIn();

                console.error('Error in authorize: ', authResponse.message);
                setAuthStatus(DatabaseAuthStatus.AuthorizationError);
                return {
                    success: false,
                    message: t(authResponse.message),
                    issues: authResponse.issues ? authResponse.issues : []
                }
            }
        } else {
            disableKeepLoggedIn();

            toast.error(t('Error in authorization challenge. Please try again.'));
            console.error('Error in authorize/challenge: ', authChallengResponse.message);
        }

        return {
            success: authChallengResponse.status === 200,
            message: t(authChallengResponse.message),
            issues: authChallengResponse.issues ? authChallengResponse.issues : []
        }        
    };

    const databaseContextValue: DatabaseContextType = {
        email,
        setDatabaseId,
        keyLocatorHash,
        setKeyLocatorHash,
        keyHash,
        setKeyHash,        
        keyHashParams,
        setKeyHashParams,
        databaseIdHash,
        setDatabaseIdHash,
        masterKey,
        setMasterKey,
        password,
        setPassword,
        authStatus,
        setAuthStatus,
        accessToken,
        setAccesToken,
        refreshToken,
        setRefreshToken,       
        create,
        authorize,
        logout,
        refresh,
        keepLoggedIn,
        acl,
        setACL,
        featureFlags
    };

    return (
        <DatabaseContext.Provider value={databaseContextValue}>
            {children}
        </DatabaseContext.Provider>
    );
};

