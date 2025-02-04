import { Result, Session } from "@/data/client/models";
import JsonView from "@uiw/react-json-view";
import Markdown from "react-markdown";
import styles from './chat.module.css'
import remarkGfm from "remark-gfm";
import DataLoader from "./data-loader";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils";
import { Mail, CalendarIcon, TimerIcon, MessageCircleIcon, TagIcon, BarChartIcon } from "lucide-react";
import { Badge } from "./ui/badge";

export function RenderSession({ session }: { session: Session | undefined}) {

    const { t } = useTranslation();
    const duration = session?.createdAt && session?.finalizedAt ?  Math.round(new Date(session?.createdAt).getTime() - new Date(session?.finalizedAt).getTime() / 60000) + t(' min') : t('not finished')
    if (!session) {
        return <DataLoader />;
    }

    return (
        <div className="grid grid-cols-2 gap-2 text-sm w-full">
          <div className="col-span-2 flex justify-between items-center mb-2">
            {session.userName ? (<h2 className="text-lg font-semibold">{session.userName}</h2>) : null}
            {session.userEmail ? (
              <a href={`mailto:${session.userEmail}`} className="text-primary hover:underline flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                {session.userEmail}
              </a>
            ) : null}
          </div>

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
            <MessageCircleIcon className="w-4 h-4 mr-2"/> {t('Messages')}: <span className="ml-2 font-medium">{session.messages ? session.messages?.length : t('no messages yet')}</span>
          </div>

          <div className="flex">
            <TagIcon className="w-4 h-4 mr-2" /> {t('Id')}: <span className="ml-2 font-medium">{session.id}</span>
          </div>


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