import { useAgentContext } from "@/contexts/agent-context";
import { SaaSContext } from "@/contexts/saas-context";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type SaaSNotification = {
    message: string;
    type: 'info' | 'warning' | 'error';
}

export function SaaSNotifications() {

    const agentContext = useAgentContext();
    const saasContext = useContext(SaaSContext);
    const { t } = useTranslation();

    const [notifications, setNotifications] = useState<SaaSNotification[]>([]);

    useEffect(() => {
        // Add your code here
    }, [saasContext.currentQuota, saasContext.currentUsage, agentContext.current, agentContext.agents]);

    return (
        <div className="p-4 text-sm border border-gray-200 rounded-lg m-4 bg-secondary">
            <h1>SaaS Notifications</h1>
        </div>
    );
}