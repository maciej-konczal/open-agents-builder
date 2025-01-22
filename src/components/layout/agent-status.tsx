'use client'
import { AgentStatusType, useAgentContext } from "@/contexts/agent-context";

export function AgentStatus() {

    const { status }  = useAgentContext();

    return ( status !== null ? 
        <div className={`text-white text-sm p-2 rounded ${status.type === 'warning' ? 'bg-orange-500' : (status.type === 'error' ? 'bg-red-500' : 'bg-green-500')}`}>
            {status.message}
        </div> : null
    )
}