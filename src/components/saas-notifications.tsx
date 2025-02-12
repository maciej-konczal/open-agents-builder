import { useAgentContext } from "@/contexts/agent-context";
import { SaaSContext } from "@/contexts/saas-context";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type SaaSNotification = {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error';
}

function addNotification(notifications: SaaSNotification[], message: string, type: 'info' | 'warning' | 'error', id: string) {
    return [...notifications.filter(fn => fn.id !== id), { message, type, id }];
}

function removeNotification(notifications: SaaSNotification[], id: string) {
    return notifications.filter(fn => fn.id !== id);
}

export function SaaSNotifications() {

    const agentContext = useAgentContext();
    const saasContext = useContext(SaaSContext);
    const { t } = useTranslation();

    const [notifications, setNotifications] = useState<SaaSNotification[]>([]);

    useEffect(() => {
        if (!saasContext.emailVerfied) {
            setNotifications(addNotification(notifications, t('Please go to your Inbox and verify your email address to use all features of Agent Doodle'), 'warning', 'email-verification'));            
        } else 
        {
            setNotifications(removeNotification(notifications, 'email-verification'));
        }

        if (saasContext.currentUsage.usedAgents > saasContext.currentQuota.allowedAgents) {
            setNotifications(addNotification(notifications, t('You have reached the maximum number of agents allowed by your plan'), 'error', 'agents-quota'));
        } else {
            setNotifications(removeNotification(notifications, 'agents-quota'));
        }

        if (saasContext.currentUsage.usedSessions > saasContext.currentQuota.allowedSessions) {
            setNotifications(addNotification(notifications, t('You have reached the maximum number of sessions allowed by your plan'), 'error', 'sessions-quota'));
        } else {
            setNotifications(removeNotification(notifications, 'sessions-quota'));
        }

        if (saasContext.currentUsage.usedUSDBudget > saasContext.currentQuota.allowedUSDBudget) {
            setNotifications(addNotification(notifications, t('You have reached the maximum budget allowed by your plan'), 'error', 'budget-quota'));
        } else {
            setNotifications(removeNotification(notifications, 'budget-quota'));
        }
        // Add your code here
    }, [saasContext.currentQuota, saasContext.currentUsage, agentContext.current, agentContext.agents]);

    return (
        <div className="p-4 text-sm text-white">
            {notifications.map((notification, index) => (
                <div key={index} className={`p-2 mb-2 rounded-lg bg-${notification.type === 'warning' ? 'orange' : notification.type === 'error' ? 'red' : 'blue'}-500`}>
                   {notification.type === 'warning' ? ('🚨') : (notification.type ==='error' ? '⛔️' : '✅')} {notification.message}
                </div>
            ))}
        </div>
    );
}