import { KeyDTO, DatabaseCreateRequestDTO, databaseCreateRequestSchema } from "@/data/dto";
import { maintenance } from "@/data/server/db-provider";
import { PlatformApiClient } from "@/data/server/platform-api-client";
import ServerKeyRepository from "@/data/server/server-key-repository";
import { authorizeSaasContext } from "@/lib/generic-api";
import { getCurrentTS, getErrorMessage, getZedErrorMessage } from "@/lib/utils";
import { NextRequest, userAgent } from "next/server";
import { features } from "process";



// This is the UC01 implementation of https://github.com/CatchTheTornado/doctor-dok/issues/65
export async function POST(request: NextRequest) {
    try {
        const jsonRequest = await request.json();
        const saasContext = await authorizeSaasContext(request); // authorize SaaS context

        const validationResult = databaseCreateRequestSchema.safeParse(jsonRequest); // validation
        if (validationResult.success === true) {

            const authCreateRequest = validationResult.data;

            if (!saasContext.hasAccess) {

                const appId = process.env.SAAS_APP_ID || 'agent-doodle';
    
                // we need to register a new account in the SaaS platform
                const apiClient = new PlatformApiClient(''); // no API key yet needed
                apiClient.createAccount(authCreateRequest)
                
    
                return Response.json({
                    message: saasContext.error,
                    status: 403
                });
            }


            if (maintenance.checkIfDatabaseExists(authCreateRequest.databaseIdHash)) { // to not avoid overriding database fiels
                return Response.json({
                    message: 'Account with given e-mail already exists. Please select different one or Log-In.',
                    data: { 
                        databaseIdHash: authCreateRequest.databaseIdHash
                    },
                    status: 409
                });            
            } else {
                await maintenance.createDatabaseManifest(authCreateRequest.databaseIdHash, {
                    databaseIdHash: authCreateRequest.databaseIdHash,
                    createdAt: getCurrentTS(),
                    creator: {
                        ip: request.ip,
                        ua: userAgent(request).ua,
                        geo: request.geo
                    }                
                });
                const keyRepo = new ServerKeyRepository(authCreateRequest.databaseIdHash); // creating a first User Key
                const existingKeys = await keyRepo.findAll({  filter: { databaseIdHash: authCreateRequest.databaseIdHash } }); // check if key already exists

                if(existingKeys.length > 0) { // this situation theoretically should not happen bc. if database file exists we return out of the function
                    return Response.json({
                        message: 'User key already exists. Please select different Id.',
                        data: { 
                            databaseIdHash: authCreateRequest.databaseIdHash
                        },
                        status: 409               
                    });                    
                } else {
                    const firstUserKey = keyRepo.create({
                        displayName: '',
                        keyLocatorHash: authCreateRequest.keyLocatorHash,
                        keyHash: authCreateRequest.keyHash,
                        keyHashParams: authCreateRequest.keyHashParams,
                        encryptedMasterKey: authCreateRequest.encryptedMasterKey,
                        databaseIdHash: authCreateRequest.databaseIdHash,                
                        acl: JSON.stringify({
                            role: 'owner',
                            features: ['*']
                        }),
                        extra: null,
                        expiryDate: null,
                        updatedAt: getCurrentTS(),
                    })

                    if (saasContext.isSaasMode) {
                        try { // create user account and register new database in SaaS platform
                            saasContext.apiClient?.newDatabase({
                                databaseIdHash: authCreateRequest.databaseIdHash,
                                createdAt: getCurrentTS()
                            })
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    return Response.json({
                        message: 'Database created successfully. Now you can log in.',
                        data: null,
                        status: 200
                    });                    
                }         
            }
        } else {
            console.error(validationResult);
            return Response.json({
                message: getZedErrorMessage(validationResult.error),
                issues: validationResult.error.issues,
                status: 400               
            });
        }
    } catch (e) {
        console.error(e);
        return Response.json({
            message: getErrorMessage(e),
            error: e,
            status: 500
        });
    }    

}
