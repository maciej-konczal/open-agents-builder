import ServerAgentRepository from "@/data/server/server-agent-repository";
import { authorizeSaasToken } from "@/lib/generic-api";
import { validateTokenQuotas } from "@/lib/quotas";

export async function GET(request: Request, { params }: { params: { id: string }} ) {
    const recordLocator = { id: params.id };
    const databaseIdHash = request.headers.get('Database-Id-Hash') || '';
    const repo = new ServerAgentRepository(databaseIdHash);
    const saasContext = await authorizeSaasToken(databaseIdHash);

    const agent = await repo.findOne(recordLocator);
    if (!agent) {
        return Response.json({ message: "Agent not found", status: 404 }, { status: 404 });
    } else {
        if (saasContext.isSaasMode) {
            if (!saasContext.hasAccess) {
                return Response.json({ message: "Unauthorized", status: 403 }, { status: 403 });
            } else {
                if (saasContext.saasContex) {
                    const resp = await validateTokenQuotas(saasContext.saasContex)
                    console.log(resp)
                    if (resp?.status !== 200) {
                        return Response.json(resp)
                    }
                } else {
                    return Response.json({ message: "Unauthorized", status: 403 }, { status: 403 });
                }
            }
        }
    }


    return Response.json({ data: agent, message: 'All set!', status: 200 }, { status: 200 });
}