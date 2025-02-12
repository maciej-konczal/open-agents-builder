import { useContext, useEffect, useState } from "react";
import { DatabaseAuthStatus } from "@/data/client/models";
import { DollarSignIcon } from "lucide-react";
import { Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle, CredenzaTrigger } from "./credenza";
import { Button } from "./ui/button";
import DatabaseLinkAlert from "./shared/database-link-alert";
import { DatabaseContext } from "@/contexts/db-context";
import { AggregatedStatsDTO } from "@/data/dto";
import { toast } from "sonner";
import { SaaSContext, SaaSContextType } from "@/contexts/saas-context";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { StatsContext } from "@/contexts/stats-context";
import { useAgentContext } from "@/contexts/agent-context";

export function roundToTwoDigits(num: number): number {
  return Math.round(num * 100) / 100;
}


function calcAvailableBudget(saasContext: SaaSContextType) {
  return roundToTwoDigits(saasContext.currentQuota.allowedUSDBudget - saasContext.currentUsage.usedUSDBudget);
}

export default function StatsPopup() {
  const dbContext = useContext(DatabaseContext);
  const statsContext = useContext(StatsContext);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStatsDTO>({});
  const saasContext = useContext(SaaSContext);
  const agentContext = useAgentContext();
  const [availableBudget, setAvailableBudget] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    const loadStats = async () => {
      if (dbContext?.authStatus == DatabaseAuthStatus.Authorized) {
        try { 
          await saasContext.loadSaaSContext('');
          if (saasContext.currentQuota) {
            setAvailableBudget(calcAvailableBudget(saasContext));
            setAggregatedStats(await statsContext.aggregatedStats());
          }
        } catch (e) {
          console.error(e);
          toast.error(t("Error while loading aggregated stats"));
        }
      }
    }
    loadStats();
  }, [saasContext.refreshDataSync]);

  return (
    <Credenza open={statsContext?.statsPopupOpen} onOpenChange={statsContext?.setStatsPopupOpen}>
      <CredenzaContent className="sm:max-w-[500px] bg-background">
        <CredenzaHeader>
          <CredenzaTitle>View token usage
          </CredenzaTitle>
          <CredenzaDescription>
            View current token usage and quotas
          </CredenzaDescription>
        </CredenzaHeader>
        <div className="bg-background border-zinc-200 dark:border-zinc-800">
          <div className="h-auto overflow-auto">
            {(dbContext?.authStatus == DatabaseAuthStatus.Authorized && aggregatedStats && aggregatedStats.thisMonth && aggregatedStats.today) ? (
              <div>
                {saasContext.userId ? (
                <div className="p-4 space-y-4">
                  <div className="text-sm font-bold w-full">Available funds</div>
                  <div className="grid grid-cols-2 w-full">
                    <div className="text-xs font-bold">available budget</div>
                    <div className={calcAvailableBudget(saasContext)<= 0 ? `text-red-500 text-xs` : `text-xs`}>{calcAvailableBudget(saasContext)}$ of {saasContext.currentQuota.allowedUSDBudget}$</div>
                    <div className="text-xs font-bold">available agents</div>
                    <div className="text-xs">{saasContext?.currentQuota.allowedAgents - saasContext.currentUsage.usedAgents} of {saasContext.currentQuota.allowedAgents}</div>
                    <div className="text-xs font-bold">available results</div>
                    <div className="text-xs">{saasContext?.currentQuota.allowedResults - saasContext.currentUsage.usedResults} of {saasContext.currentQuota.allowedResults}</div>
                    <div className="text-xs font-bold">available sessions</div>
                    <div className="text-xs">{saasContext?.currentQuota.allowedSessions - saasContext.currentUsage.usedSessions} of {saasContext.currentQuota.allowedSessions}</div>
                  </div>
                  <div className="text-xs w-full"><Link className="underline hover-gray" href="mailto:info@catchthetornado.com">Contact us if you need more</Link></div>
                </div>) : null}
                <div className="p-4 space-y-4">
                  <div className="text-sm font-bold w-full">Today</div>
                  <div className="grid grid-cols-2 w-full">
                    <div className="text-xs font-bold">prompt tokens</div>
                    <div className="text-xs">{aggregatedStats?.today.promptTokens} tokens</div>
                    <div className="text-xs font-bold">completion tokens</div>
                    <div className="text-xs">{aggregatedStats?.today.completionTokens} tokens</div>
                    <div className="text-xs font-bold">no. of requests</div>
                    <div className="text-xs">{aggregatedStats?.today.requests}</div>
                    <div className="text-xs font-bold border-gray-500 border-t-2">overall usage</div>
                    <div className="text-xs border-gray-500 border-t-2">{aggregatedStats?.today.overallTokens} tokens</div>                
                    <div className="text-xs font-bold"></div>
                    <div className="text-xs">{aggregatedStats?.today.overalUSD} $</div>
                  </div>                
                </div>
                <div className="p-4 space-y-4">
                  <div className="text-sm font-bold w-full">This month</div>
                  <div className="grid grid-cols-2 w-full">
                    <div className="text-xs font-bold">prompt tokens</div>
                    <div className="text-xs">{aggregatedStats?.thisMonth.promptTokens} tokens</div>
                    <div className="text-xs font-bold">completion tokens</div>
                    <div className="text-xs">{aggregatedStats?.thisMonth.completionTokens} tokens</div>
                    <div className="text-xs font-bold">no. of requests</div>
                    <div className="text-xs">{aggregatedStats?.thisMonth.requests}</div>
                    <div className="text-xs font-bold border-gray-500 border-t-2">overall usage</div>
                    <div className="text-xs border-gray-500 border-t-2">{aggregatedStats?.thisMonth.overallTokens} tokens</div>                
                    <div className="text-xs font-bold"></div>
                    <div className="text-xs">{aggregatedStats?.thisMonth.overalUSD} $</div>
                  </div>                
                </div>
              </div>
              
            ) : (
              <DatabaseLinkAlert />
            )}
          </div>
        </div>
      </CredenzaContent>
    </Credenza>
  );
}

