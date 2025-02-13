import { SaaSDTO } from "@/data/dto";

export function validateTokenQuotas(saasContext: SaaSDTO): {message: string; status: number}  {
    if(!saasContext?.emailVerified) {
        return { message: "You must verify e-mail to use the AI features", status: 403 };
    }

    if (((saasContext.currentQuota.allowedResults || 0) > 0) && (saasContext?.currentUsage.usedResults ?? 0) > (saasContext?.currentQuota.allowedResults || 0))
        return { message: "You have reached the limit of results", status: 403 }

    if (((saasContext.currentQuota.allowedSessions || 0) > 0) && (saasContext.currentUsage.usedSessions ?? 0) > (saasContext.currentQuota.allowedSessions || 0))
        return { message: "You have reached the limit of sessions", status: 403 }


    if (((saasContext.currentQuota.allowedUSDBudget || 0) > 0) && (saasContext.currentUsage.usedUSDBudget ?? 0) > (saasContext.currentQuota.allowedUSDBudget || 0))
        return { message: "You have reached the AI Tokens Limit", status: 403 }

    return { message: 'All OK!', status: 200 };
}
