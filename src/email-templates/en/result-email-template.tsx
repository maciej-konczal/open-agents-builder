
import { AgentDTO, ResultDTO } from "@/data/dto";
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    CodeBlock,
    Preview,
    Section,
    Text,
    dracula,
    Markdown,
  } from "@react-email/components";
  import * as React from "react";
  
  
  export interface CreateResultEmailTemplateProps {
    result: string;
    resultFormat: string;
    agent: AgentDTO;
    url: string;
    userName: string;
    userEmail: string;
  }

  export default ({
    result, resultFormat, agent, url, userEmail, userName
  }: CreateResultEmailTemplateProps) => (
    <Html>
      <Head />
      <Preview>New result has been saved</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New result of {agent.displayName} has been saved</Heading>
          <Section style={buttonContainer}>
            <Button style={button} href={url}>
              Open result details
            </Button>
          </Section>
          { userName && userEmail ? (
            <Text style={paragraph}>
              {userName} - {userEmail}
            </Text>
          ): null}
          {resultFormat === 'markdown' ? (
            <Markdown>
              {result}
            </Markdown>
          ) : (
            <CodeBlock theme={dracula} language={resultFormat.toLowerCase() === 'markdown' ? 'markdown' : 'json'} style={code} code={result ?? ''} />
          )}
          <Hr style={hr} />
          <Link href="https://agentdoodle.com" style={reportLink}>
            Agent Doodle, provided by CatchTheTornado. For Privacy and Terms visit: https://agentdoodle.com
          </Link>
        </Container>
      </Body>
    </Html>
  );
  
  const logo = {
    borderRadius: 21,
    width: 42,
    height: 42,
  };
  
  const main = {
    backgroundColor: "#ffffff",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  };
  
  const container = {
    margin: "0 auto",
    padding: "20px 0 48px",
    maxWidth: "560px",
  };
  
  const heading = {
    fontSize: "24px",
    letterSpacing: "-0.5px",
    lineHeight: "1.3",
    fontWeight: "400",
    color: "#000000",
    padding: "17px 0 0",
  };
  
  const paragraph = {
    margin: "0 0 15px",
    fontSize: "15px",
    lineHeight: "1.4",
    color: "#000000",
  };
  
  const buttonContainer = {
    padding: "27px 0 27px",
  };
  
  const button = {
    backgroundColor: "#000",
    borderRadius: "3px",
    fontWeight: "600",
    color: "#fff",
    fontSize: "15px",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
    padding: "11px 23px",
  };
  
  const reportLink = {
    fontSize: "14px",
    color: "#b4becc",
  };
  
  const hr = {
    borderColor: "#000",
    margin: "42px 0 26px",
  };
  
  const code = {
    fontFamily: "monospace",
    fontWeight: "700",
    padding: "1px 4px",
    backgroundColor: "#000",
    letterSpacing: "-0.3px",
    fontSize: "21px",
    borderRadius: "4px",
    color: "#3c4149",
  };
  
