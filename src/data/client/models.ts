import { AttachmentDTO, KeyACLDTO, KeyDTO, TermDTO, AgentDTO, SessionDTO, ResultDTO, CalendarEventDTO, ProductDTO } from "@/data/dto";

import PasswordValidator from 'password-validator';
import { getCurrentTS } from "@/lib/utils";
import { Message } from "ai";
import moment from "moment";


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

export type DisplayableDataObject = {
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
        this.assignedTo = attachmentDTO.assignedTo ? (typeof attachmentDTO.assignedTo == 'string' ? JSON.parse(attachmentDTO.assignedTo) : attachmentDTO.assignedTo) : [];
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
    databaseIdHash: string;
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
        this.databaseIdHash = keyDTO.databaseIdHash;
        this.encryptedMasterKey = keyDTO.encryptedMasterKey;
        this.acl = keyDTO instanceof Key ? keyDTO.acl : (keyDTO.acl ? JSON.parse(keyDTO.acl) : null);
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
            databaseIdHash: this.databaseIdHash,
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

export enum AgentStatus {
    Active = 'active',
    Deleted = 'deleted',
}

export class Agent {
    id?: string;
    displayName: string;
    options?: AgentOptions | null;
    prompt?: string;
    expectedResult?: string;
    safetyRules?: string;
    events?: Record<string, EventConfiguration>;
    tools?: Record<string, ToolConfiguration>;
    locale: string;
    agentType?: string | null;
    status: AgentStatus;
    createdAt: string;
    updatedAt: string;
    icon?: string | null;

    constructor(agentDTO: AgentDTO | Agent) {
        this.id = agentDTO.id;
        this.displayName = agentDTO.displayName;
        this.options = typeof agentDTO.options === 'string' ? JSON.parse(agentDTO.options as string) : agentDTO.options;

        this.prompt = agentDTO.prompt;
        this.expectedResult = agentDTO.expectedResult ?? undefined;
        this.safetyRules = agentDTO.safetyRules ?? undefined;
        this.events = typeof agentDTO.events === 'string' ? JSON.parse(agentDTO.events as string) : agentDTO.events;
        this.tools = typeof agentDTO.tools === 'string' ? JSON.parse(agentDTO.tools as string) : agentDTO.tools;


        this.createdAt = agentDTO.createdAt;
        this.updatedAt = agentDTO.updatedAt;

        this.locale = agentDTO.locale || 'en';
        this.agentType = agentDTO.agentType;
        this.status = agentDTO.status === 'deleted' ? AgentStatus.Deleted : AgentStatus.Active;

        this.icon = agentDTO.icon;
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
            expectedResult: this.expectedResult,
            safetyRules: this.safetyRules,
            events: JSON.stringify(this.events),
            tools: JSON.stringify(this.tools),
            locale: this.locale,
            agentType: this.agentType,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            icon: this.icon
        };
    }


    toForm(setValue: ((field: string, value: any) => void) | null = null): Record<string, any> {
        const map: Record<string, any> = {
            id: this?.id || '',
            displayName: this?.displayName || '',
            prompt: this?.prompt || '',
            expectedResult: this?.expectedResult || '',
            safetyRules: this?.safetyRules || '',
            welcomeInfo: this?.options?.welcomeMessage || '',
            termsConditions: this?.options?.termsAndConditions || '',
            confirmTerms: this?.options?.mustConfirmTerms || false,
            resultEmail: this?.options?.resultEmail || '',
            collectUserInfo: this?.options?.collectUserEmail,
            agentType: this?.agentType,
            status: this?.status || AgentStatus.Active,
            locale: this?.locale || 'en',
            events: this?.events || {},
            tools: this?.tools || {},
        };
        if (setValue !== null) {
            Object.keys(map).forEach((key) => {
                setValue(key, map[key]);
            });
        }

        return map;
    }

    static fromForm(data: Record<string, any>, agent?: Agent | null): Agent {
        return new Agent({
            ...agent,
            id: data.id ?? agent?.id,
            displayName: data.displayName ?? agent?.displayName,
            expectedResult: data.expectedResult ?? agent?.expectedResult,
            safetyRules: data.safetyRules ?? agent?.safetyRules,
            prompt: data.prompt ?? agent?.prompt,
            createdAt: agent?.createdAt || getCurrentTS(),
            updatedAt: getCurrentTS(),
            locale: data.locale ?? agent?.locale,
            agentType: data.agentType ?? agent?.agentType,
            status: data.status ?? agent?.status,
            events: data.events ?? agent?.events,
            tools: data.tools ?? agent?.tools,
            options: {
                ...agent?.options,
                welcomeMessage: data.welcomeInfo ?? agent?.options?.welcomeMessage,
                termsAndConditions: data.termsConditions ?? agent?.options?.termsAndConditions,
                mustConfirmTerms: data.confirmTerms ?? agent?.options?.mustConfirmTerms,
                resultEmail: data.resultEmail ?? agent?.options?.resultEmail,
                collectUserEmail: data.collectUserInfo ?? agent?.options?.collectUserEmail,
                collectUserName: data.collectUserInfo ?? agent?.options?.collectUserName
            },
        } as Agent);
    }
}

export type SessionUserInfo = {
    name: string;
    email: string;
}

export class Session {
    id: string;
    agentId: string;
    userName?: string | null;
    userEmail?: string | null;
    acceptTerms?: boolean | null;
    messages?: [Message] | null;
    completionTokens?: number | null;
    promptTokens?: number | null;
    createdAt: string;
    updatedAt: string;
    finalizedAt?: string | null;

    constructor(sessionDTO: SessionDTO | Session) {
        this.id = sessionDTO.id;
        this.agentId = sessionDTO.agentId;
        this.userName = sessionDTO.userName ?? null;
        this.userEmail = sessionDTO.userEmail ?? null;
        try {
            this.messages = sessionDTO instanceof Session ? sessionDTO.messages : (sessionDTO.messages ? JSON.parse(sessionDTO.messages) : null);
        } catch (e) {
            this.messages = null
        }
        this.completionTokens = sessionDTO.completionTokens;
        this.promptTokens = sessionDTO.promptTokens;
        this.acceptTerms = !!(sessionDTO.acceptTerms ?? null);
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
            userEmail: this.userEmail,
            userName: this.userName,
            messages: JSON.stringify(this.messages),
            promptTokens: this.promptTokens,
            completionTokens: this.completionTokens,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            finalizedAt: this.finalizedAt,
        };
    }
}


export class Result {
    agentId: string;
    sessionId: string;
    userName?: string | null;
    userEmail?: string | null;
    content?: string | null;
    format?: string | null;
    createdAt: string;
    updatedAt: string;
    finalizedAt?: string | null;

    constructor(resultDTO: ResultDTO) {
        this.agentId = resultDTO.agentId;
        this.sessionId = resultDTO.sessionId;
        this.userName = resultDTO.userName ?? null;
        this.userEmail = resultDTO.userEmail ?? null;
        this.content = resultDTO.content;
        this.format = resultDTO.format;
        this.createdAt = resultDTO.createdAt;
        this.updatedAt = resultDTO.updatedAt;
        this.finalizedAt = resultDTO.finalizedAt ?? null;
    }

    static fromDTO(resultDTO: ResultDTO): Result {
        return new Result(resultDTO);
    }

    toDTO(): ResultDTO {
        return {
            sessionId: this.sessionId,
            agentId: this.agentId,
            userName: this.userName,
            userEmail: this.userEmail,
            content: this.content,
            format: this.format,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            finalizedAt: this.finalizedAt,
        };
    }
}


export class DatabaseCreateRequest {
    email: string;
    key: string;
    language: string;

    constructor(email: string, key: string, language: string) {
        this.email = email;
        this.key = key;
        this.language = language;
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


export type ToolConfiguration = {
    tool: string;                // e.g. "sendEmail" or "currentDate"
    description: string;         // e.g. "contact support" or "get the current date"
    options: Record<string, any> // tool-specific options
};

export type EventConfiguration = {
    condition: string;
    action: string;
};


export interface Participant {
    name: string
    email: string
}

export class CalendarEvent {
    id: string
    agentId: string
    title: string
    start?: Date | null
    end?: Date | null
    exclusive?: boolean | null
    description?: string | null
    location?: string | null
    participants?: Participant[] | null
    sessionId?: string | null // Added sessionId as optional
    updatedAt: string
    createdAt: string

    constructor(eventDTO: CalendarEventDTO | CalendarEvent) {
        this.id = eventDTO.id;
        this.agentId = eventDTO.agentId;
        this.title = eventDTO.title;
        this.start = eventDTO.start ? moment(eventDTO.start).toDate() : null;
        this.end = eventDTO.end ? moment(eventDTO.end).toDate() : null;
        this.exclusive = typeof eventDTO.exclusive === 'string' ? JSON.parse(eventDTO.exclusive) : eventDTO.exclusive;
        this.description = eventDTO.description;
        this.location = eventDTO.location;
        this.participants = typeof eventDTO.participants === 'string' ? JSON.parse(eventDTO.participants) : eventDTO.participants;
        this.sessionId = eventDTO.sessionId ?? null; // Initialize optional sessionId
        this.createdAt = eventDTO.createdAt;
        this.updatedAt = eventDTO.updatedAt;
    }

    static fromDTO(eventDTO: CalendarEventDTO): CalendarEvent {
        return new CalendarEvent(eventDTO);
    }

    toDTO(): CalendarEventDTO {
        return {
            id: this.id,
            agentId: this.agentId,
            title: this.title,
            start: this.start ? moment(this.start).toISOString(true) : null,
            end: this.end ? moment(this.end).toISOString(true) : null,
            exclusive: this.exclusive ? 'true' : 'false',
            description: this.description,
            location: this.location,
            participants: JSON.stringify(this.participants),
            sessionId: this.sessionId || undefined, // Ensure sessionId persists in DTO
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}


/// commerce module

// models.ts

export interface Price {
    value: number;
    currency: string;
}

export interface ProductAttribute {
    name: string;
    type: "text" | "select";
    values?: string[];
    defaultValue?: string;
}

export interface ProductVariant {
    id?: string;
    sku: string;
    name?: string;
    status?: string;

    price?: Price;
    priceInclTax?: Price;
    taxRate?: number;
    taxValue?: number;

    width?: number;
    height?: number;
    length?: number;
    weight?: number;

    widthUnit?: string;
    heightUnit?: string;
    lengthUnit?: string;
    weightUnit?: string;

    brand?: string;
}

export interface ProductImage {
    id: string;
    url: string;
    alt?: string;
    storageKey?: string;
}

export class Product {
    id?: string;
    agentId?: string | null;

    sku: string;
    name: string;
    description?: string;

    price?: Price;
    priceInclTax?: Price;

    taxRate?: number;
    taxValue?: number;

    width?: number;
    height?: number;
    length?: number;
    weight?: number;

    widthUnit?: string;
    heightUnit?: string;
    lengthUnit?: string;
    weightUnit?: string;

    brand?: string;
    status?: string;

    imageUrl?: string;

    attributes?: ProductAttribute[];
    variants?: ProductVariant[];
    images?: ProductImage[];
    tags?: string[];

    createdAt: string;
    updatedAt: string;

    constructor(dto: ProductDTO | Product) {
        this.id = dto.id;
        this.agentId = dto.agentId ?? null;

        this.sku = dto.sku;
        this.name = dto.name;
        this.description = dto.description ?? undefined;

        this.price = dto.price;
        this.priceInclTax = dto.priceInclTax;

        this.taxRate = dto.taxRate;
        this.taxValue = dto.taxValue;

        this.width = dto.width;
        this.height = dto.height;
        this.length = dto.length;
        this.weight = dto.weight;

        this.widthUnit = dto.widthUnit;
        this.heightUnit = dto.heightUnit;
        this.lengthUnit = dto.lengthUnit;
        this.weightUnit = dto.weightUnit;

        this.brand = dto.brand;
        this.status = dto.status;

        this.imageUrl = dto.imageUrl ?? undefined;

        this.attributes = dto.attributes ?? [];
        this.variants = dto.variants ?? [];
        this.images = dto.images ?? [];
        this.tags = dto.tags ?? [];

        this.createdAt = dto.createdAt;
        this.updatedAt = dto.updatedAt;
    }

    static fromDTO(dto: ProductDTO): Product {
        return new Product(dto);
    }

    toDTO(): ProductDTO {
        return {
            id: this.id,
            agentId: this.agentId,

            sku: this.sku,
            name: this.name,
            description: this.description,

            price: this.price,
            priceInclTax: this.priceInclTax,
            taxRate: this.taxRate,
            taxValue: this.taxValue,

            width: this.width,
            height: this.height,
            length: this.length,
            weight: this.weight,

            widthUnit: this.widthUnit,
            heightUnit: this.heightUnit,
            lengthUnit: this.lengthUnit,
            weightUnit: this.weightUnit,

            brand: this.brand,
            status: this.status,

            imageUrl: this.imageUrl,

            attributes: this.attributes,
            variants: this.variants,
            images: this.images,
            tags: this.tags,

            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    /**
     * Metoda toForm(...) – np. do React Hook Form
     */
    toForm(setValue?: (field: string, value: any) => void): Record<string, any> {
        const formData: Record<string, any> = {
            id: this.id,
            agentId: this.agentId,

            sku: this.sku,
            name: this.name,
            description: this.description ?? "",

            price: this.price?.value ?? 0,
            currency: this.price?.currency ?? "USD",

            priceInclTax: this.priceInclTax?.value ?? 0,

            taxRate: this.taxRate ?? 0,
            taxValue: this.taxValue ?? 0,

            width: this.width ?? 0,
            height: this.height ?? 0,
            length: this.length ?? 0,
            weight: this.weight ?? 0,

            widthUnit: this.widthUnit ?? "cm",
            heightUnit: this.heightUnit ?? "cm",
            lengthUnit: this.lengthUnit ?? "cm",
            weightUnit: this.weightUnit ?? "kg",

            brand: this.brand ?? "",
            status: this.status ?? "active",

            imageUrl: this.imageUrl ?? "",

            attributes: this.attributes ?? [],
            variants: this.variants ?? [],
            images: this.images ?? [],
            tags: this.tags ?? [],
        };

        if (setValue) {
            Object.keys(formData).forEach((key) => {
                setValue(key, formData[key]);
            });
        }
        return formData;
    }

    /**
     * Tworzenie obiektu Product z formularza (lub analogicznie):
     */
    static fromForm(data: Record<string, any>, existing?: Product | null): Product {
        return new Product({
            ...existing,
            id: data.id ?? existing?.id,
            agentId: data.agentId ?? existing?.agentId,

            sku: data.sku ?? existing?.sku,
            name: data.name ?? existing?.name,
            description: data.description ?? existing?.description,

            price: {
                value: data.price ?? existing?.price?.value ?? 0,
                currency: data.currency ?? existing?.price?.currency ?? "USD",
            },
            priceInclTax: {
                value: data.priceInclTax ?? existing?.priceInclTax?.value ?? 0,
                currency: data.currency ?? existing?.priceInclTax?.currency ?? "USD",
            },

            taxRate: data.taxRate ?? existing?.taxRate ?? 0,
            taxValue: data.taxValue ?? existing?.taxValue ?? 0,

            width: data.width ?? existing?.width ?? 0,
            height: data.height ?? existing?.height ?? 0,
            length: data.length ?? existing?.length ?? 0,
            weight: data.weight ?? existing?.weight ?? 0,

            widthUnit: data.widthUnit ?? existing?.widthUnit ?? "cm",
            heightUnit: data.heightUnit ?? existing?.heightUnit ?? "cm",
            lengthUnit: data.lengthUnit ?? existing?.lengthUnit ?? "cm",
            weightUnit: data.weightUnit ?? existing?.weightUnit ?? "kg",

            brand: data.brand ?? existing?.brand ?? "",
            status: data.status ?? existing?.status ?? "active",

            imageUrl: data.imageUrl ?? existing?.imageUrl,

            attributes: data.attributes ?? existing?.attributes ?? [],
            variants: data.variants ?? existing?.variants ?? [],
            images: data.images ?? existing?.images ?? [],
            tags: data.tags ?? existing?.tags ?? [],

            createdAt: existing?.createdAt || getCurrentTS(),
            updatedAt: getCurrentTS(),
        } as Product);
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

export const passwordValidator = (value: string) => {
    const passSchema = new PasswordValidator();
    passSchema.is().min(6).has().not().spaces();
    return passSchema.validate(value);
}

export const sharingKeyValidator = (value: string) => {
    const passSchema = new PasswordValidator();
    passSchema.is().min(6).has().not().spaces().has().digits(6);
    return passSchema.validate(value);
}

export type UploadedFile = {
    id: number | string;
    file: File;
    uploaded: boolean;
    status: FileUploadStatus;
    index: number;
    dto: AttachmentDTO | null;
}

export enum FileUploadStatus {
  QUEUED = 'queued',
  UPLOADING = 'uploading',
  SUCCESS = 'ok',
  ERROR = 'error',
  ENCRYPTING = 'encrypting'
}
