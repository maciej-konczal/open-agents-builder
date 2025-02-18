import { Credenza, CredenzaContent, CredenzaTrigger } from "./credenza";
import { MessageCircleIcon } from "lucide-react";
import { ChatMessages, DisplayToolResultsMode } from "./chat-messages";
import { Message } from "ai";
import { useContext, useEffect, useState } from "react";
import { Button } from "./ui/button";
import DataLoader from "./data-loader";
import { SessionApiClient } from "@/data/client/session-api-client";
import { DatabaseContext } from "@/contexts/db-context";
import { SaaSContext } from "@/contexts/saas-context";
import { Session } from "@/data/client/models";
import { getErrorMap } from "zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function SessionMessagesDialog({ sessionId, displayToolResultsMode }: { sessionId:string, displayToolResultsMode: DisplayToolResultsMode }) {

  const [messages, setMesssages] = useState([] as Message[]); 
  const dbContext = useContext(DatabaseContext);
  const saasContext = useContext(SaaSContext);
  const { t } = useTranslation();


  useEffect(() => {
    
    const client = new SessionApiClient('', dbContext, saasContext);
    client.get(sessionId).then((sessions) => {
        if (sessions.length > 0) {
            const session = Session.fromDTO(sessions[0]);
            if (session.messages) setMesssages(session.messages);
        }
    }).catch((e) => {
        console.error(e);
        toast.error(t(getErrorMessage(e)))
    });
    

  }, [sessionId]);


  return (<Credenza>
    <CredenzaTrigger asChild>
      <Button className="ml-auto right-20 mr-2" size={"sm"} variant="secondary">
        <MessageCircleIcon className="w-4 h-4" />
      </Button>
    </CredenzaTrigger>
    <CredenzaContent>
        {messages ? (
          <ChatMessages 
            displayToolResultsMode={displayToolResultsMode}
            displayTimestamps={true}
            messages={messages}
          />
        ) : <div className="flex justify-center items-center h-64"><DataLoader /></div>}
    </CredenzaContent>
  </Credenza>);
}