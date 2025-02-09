import { KeyDTO, DatabaseCreateRequestDTO, databaseCreateRequestSchema, SaaSUserDTO } from "@/data/dto";
import { maintenance } from "@/data/server/db-provider";
import { PlatformApiClient } from "@/data/server/platform-api-client";
import ServerKeyRepository from "@/data/server/server-key-repository";
import { authorizeSaasContext, authorizeSaasToken } from "@/lib/generic-api";
import { getCurrentTS, getErrorMessage, getZedErrorMessage } from "@/lib/utils";
import { NextRequest, userAgent } from "next/server";
import { features } from "process";
import { escape } from "querystring";



// This is the UC01 implementation of https://github.com/CatchTheTornado/doctor-dok/issues/65
export async function POST(request: NextRequest) {
    try {
        const jsonRequest = await request.json();
        let saasContext = await authorizeSaasContext(request); // authorize SaaS context

        const validationResult = databaseCreateRequestSchema.safeParse(jsonRequest); // validation
        if (validationResult.success === true) {

            const authCreateRequest = validationResult.data;
            if (maintenance.checkIfDatabaseExists(authCreateRequest.databaseIdHash)) { // to not avoid overriding database fiels
                return Response.json({
                    message: 'Account with given e-mail already exists. Please select different one or Log-In.',
                    data: { 
                        databaseIdHash: authCreateRequest.databaseIdHash
                    },
                    status: 409
                });            
            } else {
                if (!saasContext.hasAccess && saasContext.isSaasMode) {
    
                    const appId = process.env.SAAS_APP_ID || 'agentdoodle';
                    const adminApiKey = process.env.SAAS_API_KEY;
    
                    // we need to register a new account in the SaaS platform
                    const apiClient = new PlatformApiClient(adminApiKey || ''); // no API key yet needed
                    const createUserResponse = await apiClient.createAccount({
                        databaseIdHash: authCreateRequest.databaseIdHash,
                        email: authCreateRequest.email,
                        appId
                    })
    
                    if (createUserResponse.status === 200) { // new account created - let's try authroize it
                        const newUserData = createUserResponse.data as SaaSUserDTO;
                        
                        try { // create user account and register new database in SaaS platform
                            const userAuthorizedApiClient = new PlatformApiClient(newUserData.activeApiKey);
                            await userAuthorizedApiClient.newDatabase({
                                databaseIdHash: authCreateRequest.databaseIdHash,
                                createdAt: getCurrentTS()
                            })
                        } catch (e) {
                            console.log(e)
                        }

                        saasContext = await authorizeSaasToken(authCreateRequest.databaseIdHash, newUserData.activeApiKey);    
                        if (!saasContext.hasAccess)
                        {
                            return Response.json({
                                message: saasContext.error,
                                status: 403
                            });
                        }
                    } else {
                        return Response.json({
                            message: createUserResponse.message,
                            status: 403
                        });
                    }
                }

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

                    return Response.json({
                        message: 'Database created successfully. Now you can log in.',
                        data: {
                            databaseIdHash: authCreateRequest.databaseIdHash,
                            saasContext: saasContext ? saasContext.saasContex : null
                        },
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
