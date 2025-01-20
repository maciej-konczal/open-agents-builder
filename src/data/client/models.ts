import { AttachmentDTO, KeyACLDTO, KeyDTO, FolderDTO, RecordDTO, TermDTO, AgentDTO, SessionDTO } from "@/data/dto";
import { z } from "zod";

import PasswordValidator from 'password-validator';
import { getCurrentTS } from "@/lib/utils";
import { sha256 } from "@/lib/crypto";
import { MessageEx } from "@/contexts/chat-context";


export enum DataLoadingStatus {
    Idle = 'idle',
    Loading = 'loading',
    Success = 'success',
    Error = 'error',
}

export enum DatabaseAuthStatus {
    Empty = 'Empty',
    NotAuthorized = 'NotAuthorized',
    AuthorizationError = 'AuthorizationError',
    Authorized = 'Success',
    InProgress = 'InProgress'
}


export type AttachmentAssigment = {
    id: number;
    type: string;
}

export type DisplayableDataObject =  {
    contentType?: string;
    url: string;
    name: string;
}

export class Attachment {
    id?: number;
    assignedTo?: AttachmentAssigment[];
    displayName: string;
    description?: string;
    mimeType?: string;
    type?: string;
    json?: string;
    extra?: string;
    size: number;
    storageKey: string;
    filePath?: string;
    createdAt: string;
    updatedAt: string;

    constructor(attachmentDTO: AttachmentDTO) {
        this.id = attachmentDTO.id;
        this.assignedTo = attachmentDTO.assignedTo ? ( typeof attachmentDTO.assignedTo == 'string' ? JSON.parse(attachmentDTO.assignedTo) : attachmentDTO.assignedTo ): [];
        this.displayName = attachmentDTO.displayName;
        this.description = attachmentDTO.description ? attachmentDTO.description : '';
        this.mimeType = attachmentDTO.mimeType ? attachmentDTO.mimeType : '';
        this.type = attachmentDTO.type ? attachmentDTO.type : '';
        this.json = attachmentDTO.json ? attachmentDTO.json : '';
        this.extra = attachmentDTO.extra ? attachmentDTO.extra : '';
        this.size = attachmentDTO.size;
        this.storageKey = attachmentDTO.storageKey;
        this.filePath = attachmentDTO.filePath ? attachmentDTO.filePath : '';
        this.createdAt = attachmentDTO.createdAt;
        this.updatedAt = attachmentDTO.updatedAt;
    }

    static fromDTO(fileDTO: AttachmentDTO): Attachment {
        return new Attachment(fileDTO);
    }

    toDTO(): AttachmentDTO {
        return {
            id: this.id,
            assignedTo: JSON.stringify(this.assignedTo),
            displayName: this.displayName,
            description: this.description,
            mimeType: this.mimeType,
            type: this.type,
            json: this.json,
            extra: this.extra,
            size: this.size,
            storageKey: this.storageKey,
            filePath: this.filePath,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

export class KeyACL {
    role: string;
    features: string[];
    constructor(keyACLDTO: KeyACLDTO) {
        this.role = keyACLDTO.role;
        this.features = keyACLDTO.features;
    }

    static fromDTO(keyACLDTO: KeyACLDTO): KeyACL {
        return new KeyACL(keyACLDTO);
    }

    toDTO(): KeyACLDTO {
        return {
            role: this.role,
            features: this.features,
        };
    }

}

export class Key {
    displayName: string;
    keyLocatorHash: string;
    keyHash: string;
    keyHashParams: string;
    emailHash: string;
    encryptedMasterKey: string;
    acl: KeyACL | null;
    extra: string | null;
    expiryDate: string | null;
    updatedAt: string;

    constructor(keyDTO: KeyDTO | Key) {
        this.displayName = keyDTO.displayName;
        this.keyLocatorHash = keyDTO.keyLocatorHash;
        this.keyHash = keyDTO.keyHash;
        this.keyHashParams = keyDTO.keyHashParams;
        this.emailHash = keyDTO.emailHash;
        this.encryptedMasterKey = keyDTO.encryptedMasterKey;
        this.acl = keyDTO instanceof Key ? keyDTO.acl :  (keyDTO.acl ? JSON.parse(keyDTO.acl) : null);
        this.extra = keyDTO.extra ?? null;
        this.expiryDate = keyDTO.expiryDate ?? null;
        this.updatedAt = keyDTO.updatedAt ?? getCurrentTS();
    }

    static fromDTO(keyDTO: KeyDTO): Key {
        return new Key(keyDTO);
    }

    toDTO(): KeyDTO {
        return {
            displayName: this.displayName,
            keyLocatorHash: this.keyLocatorHash,
            keyHash: this.keyHash,
            keyHashParams: this.keyHashParams,
            emailHash: this.emailHash,
            encryptedMasterKey: this.encryptedMasterKey,
            acl: JSON.stringify(this.acl),
            extra: this.extra,
            expiryDate: this.expiryDate,
            updatedAt: this.updatedAt,
        };
    }
}

export class Term {
    id?: number;
    content: string;
    key: string;
    signature: string;
    ip?: string;
    ua?: string;
    name?: string;
    email?: string;
    signedAt: string;
    code: string;

    constructor(termDTO: TermDTO | Term) {
        this.id = termDTO.id;
        this.key = termDTO.key;
        this.content = termDTO.content;
        this.signature = termDTO.signature;
        this.ip = termDTO.ip ?? '';
        this.ua = termDTO.ua ?? '';
        this.name = termDTO.name ?? '';
        this.code = termDTO.code;
        this.email = termDTO.email ?? '';
        this.signedAt = termDTO.signedAt;
    }

    static fromDTO(termDTO: TermDTO): Term {
        return new Term(termDTO);
    }

    toDTO(): TermDTO {
        return {
            id: this.id,
            key: this.key,
            code: this.code,
            content: this.content,
            signature: this.signature,
            ip: this.ip,
            ua: this.ua,
            name: this.name,
            email: this.email,
            signedAt: this.signedAt,
        };
    }
    
}

export type AgentOptions = { 
    welcomeMessage: string;
    termsAndConditions: string;
    mustConfirmTerms: boolean;
    resultEmail: string;
    collectUserEmail: boolean;
    collectUserName: boolean;
}

export type AgentSafetyRules = [
    {
        rule: string;
    }
]

export class Agent {
    id: string;
    displayName: string;
    options?: AgentOptions | null;
    prompt: string;
    exoectedResult?: string;
    safetyRules?: AgentSafetyRules | null;
    createdAt: string;
    updatedAt: string;

    constructor(agentDTO: AgentDTO) {
        this.id = agentDTO.id;
        this.displayName = agentDTO.displayName;
        this.options = agentDTO instanceof Agent ? agentDTO.options :  (agentDTO.options ? JSON.parse(agentDTO.options) : null);

        this.prompt = agentDTO.prompt;
        this.exoectedResult = agentDTO.exoectedResult ?? undefined;
        this.safetyRules = agentDTO instanceof Agent ? agentDTO.safetyRules :  (agentDTO.safetyRules ? JSON.parse(agentDTO.safetyRules) : null);

        this.createdAt = agentDTO.createdAt;
        this.updatedAt = agentDTO.updatedAt;
    }

    static fromDTO(agentDTO: AgentDTO): Agent {
        return new Agent(agentDTO);
    }

    toDTO(): AgentDTO {
        return {
            id: this.id,
            displayName: this.displayName,
            options: JSON.stringify(this.options),
            prompt: this.prompt,
            exoectedResult: this.exoectedResult,
            safetyRules: JSON.stringify(this.safetyRules),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

export type SessionUserInfo = {
    name: string;
    email: string;
}

export class Session {
    id: string;
    agentId: string;
    user?: SessionUserInfo | null;
    messages?: [MessageEx] | null;
    result?: string | null;
    createdAt: string;
    updatedAt: string;
    finalizedAt?: string | null;

    constructor(sessionDTO: SessionDTO) {
        this.id = sessionDTO.id;
        this.agentId = sessionDTO.agentId;
        this.user = sessionDTO instanceof Session ? sessionDTO.user :  (sessionDTO.user ? JSON.parse(sessionDTO.user) : null);
        this.messages = sessionDTO instanceof Session ? sessionDTO.messages :  (sessionDTO.messages ? JSON.parse(sessionDTO.messages) : null);
        this.result = sessionDTO.result ?? null;
        this.createdAt = sessionDTO.createdAt;
        this.updatedAt = sessionDTO.updatedAt;
        this.finalizedAt = sessionDTO.finalizedAt ?? null;
    }

    static fromDTO(sessionDTO: SessionDTO): Session {
        return new Session(sessionDTO);
    }

    toDTO(): SessionDTO {
        return {
            id: this.id,
            agentId: this.agentId,
            user: JSON.stringify(this.user),
            messages: JSON.stringify(this.messages),
            result: this.result,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            finalizedAt: this.finalizedAt,
        };
    }
}


export class DatabaseCreateRequest {
    email: string;
    key: string;

    constructor(email: string, key: string) {
        this.email = email;
        this.key = key;
    }
}


export class DatabaseKeepLoggedInRequest {
    encryptedDatabaseId: string;
    encryptedKey: string;
    keepLoggedIn: boolean;

    constructor(encryptedDatabaseId: string, encryptedKey: string, keepLoggedIn: boolean) {
        this.encryptedDatabaseId = encryptedDatabaseId;
        this.encryptedKey = encryptedKey;;
        this.keepLoggedIn = keepLoggedIn;
    }
}

export class DatabaseAuthorizeRequest {
    email: string;
    key: string;
    keepLoggedIn: boolean;

    constructor(email: string, key: string, keepLoggedIn: boolean) {
        this.email = email;
        this.key = key;
        this.keepLoggedIn = keepLoggedIn;
    }
}

export class DatabaseRefreshRequest {
    refreshToken: string;
    keepLoggedIn?: boolean;

    constructor(refreshToken: string, keepLoggedIn?: boolean) {
        this.refreshToken = refreshToken;
        this.keepLoggedIn = keepLoggedIn;
    }
}



export const passwordValidator = (value:string) => {
    const passSchema = new PasswordValidator();
    passSchema.is().min(6).has().not().spaces();
    return passSchema.validate(value);
}

export const sharingKeyValidator = (value:string) => {
    const passSchema = new PasswordValidator();
    passSchema.is().min(6).has().not().spaces().has().digits(6);
    return passSchema.validate(value);
}