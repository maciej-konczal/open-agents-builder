import { KeyType } from "@/data/client/models";
import { KeyDTO, defaultKeyACL, KeyACLDTO } from "@/data/dto";
import { authorizeKey } from "@/data/server/server-key-helpers";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { AuthorizedRequestContext } from "./generic-api";
import { precheckAPIRequest } from "./middleware-precheck-api";

export async function authorizeRequestContext(request: Request, response?: NextResponse): Promise<AuthorizedRequestContext> {
    const { jwtToken, apiRequest } = await precheckAPIRequest(request as NextRequest);
    
    if (jwtToken) {
        const decoded = await jwtVerify(jwtToken as string, new TextEncoder().encode(process.env.NEXT_PUBLIC_TOKEN_SECRET || 'Jeipho7ahchue4ahhohsoo3jahmui6Ap'));

        const authResult = await authorizeKey({
            databaseIdHash: decoded.payload.databaseIdHash as string,
            keyHash: decoded.payload.keyHash as string,
            keyLocatorHash: decoded.payload.keyLocatorHash as string,            
        }, (apiRequest ?  KeyType.API : KeyType.User));
        if(!authResult) {
            NextResponse.json({ message: 'Unauthorized', status: 401 });
            throw new Error('Unauthorized. Wrong Key.');
        } else {
            const keyACL = (authResult as KeyDTO).acl ?? null;
            const aclDTO = keyACL ? JSON.parse(keyACL) : defaultKeyACL
            return {
                databaseIdHash: decoded.payload.databaseIdHash as string,
                keyHash: decoded.payload.keyHash as string,
                keyLocatorHash: decoded.payload.keyLocatorHash as string,
                acl: aclDTO as KeyACLDTO,
                extra: (authResult as KeyDTO).extra
            }
        }
    } else {
        throw new Error('Unauthorized. No Token');
    }
}