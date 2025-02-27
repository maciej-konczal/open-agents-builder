import { Key, KeyType } from "../client/models";
import { DatabaseAuthorizeRequestDTO, KeyDTO } from "../dto";
import ServerKeyRepository from "./server-key-repository";

export async function authorizeKey(authRequest: DatabaseAuthorizeRequestDTO, type: KeyType = KeyType.User): Promise<KeyDTO | boolean> {
    const keyRepo = new ServerKeyRepository(authRequest.databaseIdHash); // get the user key
    const existingKeys:KeyDTO[] = await keyRepo.findAll({  filter: { keyLocatorHash: authRequest.keyLocatorHash } }); // check if key already exists

    if(existingKeys.length === 0) { // this situation theoretically should not happen bc. if database file exists we return out of the function
        return false;      
    } else {
        const keyModel = Key.fromDTO(existingKeys[0]);
        const isExpired = keyModel.expiryDate ? (new Date(keyModel.expiryDate)).getTime() < Date.now() : false;
        if (keyModel.keyHash !== authRequest.keyHash || isExpired) {    
            return false;
        } else {

            if (keyModel.extra && keyModel.extra.type !== type) {
                console.error('Trying to authorize key with wrong type');
                return false;
            }
            return existingKeys[0];
        }
    }
}