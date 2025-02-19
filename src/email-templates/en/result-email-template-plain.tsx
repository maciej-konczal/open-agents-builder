import * as React from "react";
import { CreateResultEmailTemplateProps } from "./result-email-template";
  
// eslint-disable-next-line
  export default ({
    result, resultFormat, agent, url
  }: CreateResultEmailTemplateProps) => (
          <>New result has been saved for {agent.displayName}! 
        
          Click this link to open the result details: {url}

          Result content in plain text:
          {result}
          </> 
  );
  
