import ServerAgentRepository from "@/data/server/server-agent-repository";
import { authorizeSaasToken } from "@/lib/generic-api";

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
                if (((saasContext.saasContex?.currentQuota.allowedResults || 0) > 0) && (saasContext.saasContex?.currentUsage.usedResults ?? 0) > (saasContext.saasContex?.currentQuota.allowedResults || 0))
                    return Response.json({ message: "You have reached the limit of results", status: 403 }, { status: 403 });

                if (((saasContext.saasContex?.currentQuota.allowedSessions || 0) > 0) && (saasContext.saasContex?.currentUsage.usedSessions ?? 0) > (saasContext.saasContex?.currentQuota.allowedSessions || 0))
                    return Response.json({ message: "You have reached the limit of sessions", status: 403 }, { status: 403 });


                if (((saasContext.saasContex?.currentQuota.allowedUSDBudget || 0) > 0) && (saasContext.saasContex?.currentUsage.usedUSDBudget ?? 0) > (saasContext.saasContex?.currentQuota.allowedUSDBudget || 0))
                    return Response.json({ message: "You have reached the AI Tokens Limit", status: 403 }, { status: 403 });

            }
        }
    }


    return Response.json(agent);
}