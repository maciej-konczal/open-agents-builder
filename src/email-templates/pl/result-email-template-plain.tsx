import * as React from "react";
import { CreateResultEmailTemplateProps } from "./result-email-template";
  
// eslint-disable-next-line
  export default ({
    result, resultFormat, agent, url
  }: CreateResultEmailTemplateProps) => (
          <>Nowy wynik został zapisany dla {agent.displayName}! 
        
          Kliknij ten link, aby otworzyć szczegóły wyniku: {url}

          Treść wyniku w formacie tekstowym:
          {result}
          </> 
  );
  
