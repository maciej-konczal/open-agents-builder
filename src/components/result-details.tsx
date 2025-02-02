import type { FC } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChartIcon, CalendarIcon, Mail, MessageCircleIcon, TimerIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

export interface ResultDetailsProps {
  sessionStart: Date
  sessionEnd: Date
  userName: string
  userEmail: string
  messageCount: number
  inputTokens: number
  outputTokens: number
}

const ResultDetails: FC<ResultDetailsProps> = ({
  sessionStart,
  sessionEnd,
  userName,
  userEmail,
  messageCount,
  inputTokens,
  outputTokens,
}) => {
  const duration = sessionEnd.getTime() - sessionStart.getTime()
  const durationInMinutes = Math.round(duration / 60000)

  const { t } = useTranslation()

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-2 text-sm w-full">
          <div className="col-span-2 flex justify-between items-center mb-2">
            {userName ? (<h2 className="text-lg font-semibold">{userName}</h2>) : null}
            {userEmail ? (
              <a href={`mailto:${userEmail}`} className="text-primary hover:underline flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                {userEmail}
              </a>
            ) : null}
          </div>

          <div className="flex">
            <CalendarIcon className="w-4 h-4 mr-2" /> {t('Started')}: <span className="ml-2 font-medium">{formatDate(sessionStart)}</span>
          </div>
          
          <div className="flex">
            <CalendarIcon className="w-4 h-4 mr-2" /> {t('Ended')}: <span className="ml-2 font-medium">{formatDate(sessionEnd)}</span>
          </div>

          <div className="flex">
            <TimerIcon className="w-4 h-4 mr-2" /> {t('Duration')}: <span className="ml-2 font-medium">{durationInMinutes} {t('min')}</span>
          </div>
          
          <div className="flex">
            <MessageCircleIcon className="w-4 h-4 mr-2"/> {t('Messages')}: <span className="ml-2 font-medium">{messageCount}</span>
          </div>

          <div className="col-span-2 flex justify-between items-center mt-2">
            <Badge variant="outline" className="text-primary">
              <BarChartIcon className="w-4 h-4 mr-2" /> {t('Input Tokens')}: {inputTokens}
            </Badge>
            <Badge variant="outline" className="text-primary">
            <BarChartIcon className="w-4 h-4 mr-2" /> {t('Output Tokens')}: {outputTokens}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ResultDetails

