import { Session } from "@/data/client/models";
import DataLoader from "./data-loader";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils";
import { Mail, CalendarIcon, TimerIcon, MessageCircleIcon, TagIcon, BarChartIcon, BookIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import Link from "next/link";

export function RenderSession({ session }: { session: Session | undefined}) {

    const { t } = useTranslation();
    const duration = session?.createdAt && session?.finalizedAt ?  Math.round((new Date(session?.finalizedAt).getTime() - new Date(session?.createdAt).getTime()) / 60000) + t(' min') : t('not finished')
    if (!session) {
        return <DataLoader />;
    }

    return (
        <div className="grid grid-cols-2 gap-2 text-sm w-full">
          <div className="flex">
            <CalendarIcon className="w-4 h-4 mr-2" /> {t('Started')}: <span className="ml-2 font-medium">{session.createdAt ? formatDate(new Date(session?.createdAt)) : t('N/A')}</span>
          </div>
          
          <div className="flex">
            <CalendarIcon className="w-4 h-4 mr-2" /> {t('Ended')}: <span className="ml-2 font-medium">{session.finalizedAt ? formatDate(new Date(session.finalizedAt)) : t('not finished')}</span>
          </div>

          <div className="flex">
            <TimerIcon className="w-4 h-4 mr-2" /> {t('Duration')}: <span className="ml-2 font-medium">{duration}</span>
          </div>
          
          <div className="flex">
            <Link className="flex" href={`/admin/agent/${session.agentId}/sessions/${session.id}`}>
              <MessageCircleIcon className="w-4 h-4 mr-2"/> {t('Messages')}: <span className="ml-2 font-medium">{session.messages ? session.messages?.length : t('no messages yet')}</span>
            </Link>
          </div>

          <div className="flex">
            <Link className="flex" href={`/admin/agent/${session.agentId}/sessions/${session.id}`}>
              <TagIcon className="w-4 h-4 mr-2" /> {t('Session Id')}: <span className="ml-2 font-medium">{session.id}</span>
            </Link>
          </div>
          
          { session.finalizedAt ? (
            <div className="flex">
              <Link className="flex" href={`/admin/agent/${session.agentId}/results/${session.id}`}>
                <BookIcon className="w-4 h-4 mr-2"/> {t('Has saved result')}
              </Link>
            </div>
          ) : null}


          <div className="col-span-2 flex justify-between items-center mt-2">
            <Badge variant="outline" className="text-primary">
              <BarChartIcon className="w-4 h-4 mr-2" /> {t('Input Tokens')}: {session.promptTokens}
            </Badge>
            <Badge variant="outline" className="text-primary">
            <BarChartIcon className="w-4 h-4 mr-2" /> {t('Output Tokens')}: {session.completionTokens}
            </Badge>
          </div>
        </div>
    )

}