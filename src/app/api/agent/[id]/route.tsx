import ServerAgentRepository from "@/data/server/server-session-repository";
import {  authorizeRequestContext, genericDELETE } from "@/lib/generic-api";

export async function DELETE(request: Request, { params }: { params: { id: number }} ) {
    const recordLocator = params.id;
    const requestContext = await authorizeRequestContext(request);

    if(!recordLocator){
        return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
    } else { 
        return Response.json(await genericDELETE(request, new ServerAgentRepository(requestContext.emailHash), { id: recordLocator}));
    }
}
