'use client'

import { AgentStatusType } from "@/contexts/agent-context"

export function AgentStatus({ status } : { status: AgentStatusType | null}) {


    return ( status !== null ? 
        <div className={`text-white text-sm p-2 rounded ${status.type === 'warning' ? 'bg-orange-500' : (status.type === 'error' ? 'bg-red-500' : 'bg-green-500')}`}>
            {status.message}
        </div> : null
    )
}