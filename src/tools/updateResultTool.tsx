import { z } from 'zod';
import { tool } from 'ai';
import { ResultDTO } from '@/data/dto';
import ServerResultRepository from '@/data/server/server-result-repository';
import { ToolDescriptor } from './registry';
import ServerSessionRepository from '@/data/server/server-session-repository';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import { Agent } from '@/data/client/models';
import { Resend } from 'resend';
import i18next from 'i18next';

import CreatePLResultTemplate from '@/email-templates/pl/result-email-template';
import CreatePLResultTemplatePlain from '@/email-templates/pl/result-email-template-plain';
import CreateENResultTemplate from '@/email-templates/en/result-email-template';
import CreateENResultTemplatePlain from '@/email-templates/en/result-email-template-plain';
import { auditLog, authorizeSaasContext, authorizeSaasToken } from '@/lib/generic-api';
import { detailedDiff } from 'deep-object-diff';

const emailTemplatesLocalized: Record<string, any> = {
  pl: {
    html: CreatePLResultTemplate,
    plain: CreatePLResultTemplatePlain
  },
  en: {
    html: CreateENResultTemplate,
    plain: CreateENResultTemplatePlain
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

export function createUpdateResultTool(databaseIdHash: string, storageKey: string | undefined | null): ToolDescriptor
{
  return {
  displayName: 'Save result',
  tool:tool({
          description: 'Save results',
          parameters: z.object({
            sessionId: z.string().describe('The result/session ID to be updated'),
            language: z.string().describe('Result language code for example "pl" or "en"'),
            format: z.string().describe('The format of the inquiry results (requested by the user - could be: JSON, markdown, text etc.)'),
            result: z.string().describe('The inquiry results - in different formats (requested by the user - could be JSON, markdown, text etc.)'),
          }),
          execute: async ({ sessionId, result, format, language }) => {
            try {
              const resultRepo = new ServerResultRepository(databaseIdHash, storageKey);
              const sessionsRepo = new ServerSessionRepository(databaseIdHash, storageKey);
              const agentsRepo = new ServerAgentRepository(databaseIdHash);
              const existingSessionDTO = await sessionsRepo.findOne({ id: sessionId });
              const currentAgentDTO = await agentsRepo.findOne({ id: existingSessionDTO?.agentId });

              i18next.init({
                preload: [language]
              });
              i18next.loadLanguages([language]);
            

              if(!existingSessionDTO) {
                return 'Session not found, please check the sessionId';
              }

              const existingResult = await resultRepo.findOne({ sessionId });

              const storedResult = {
                sessionId,
                agentId: existingSessionDTO?.agentId,
                userEmail: existingSessionDTO?.userEmail,
                userName: existingSessionDTO?.userName,
                createdAt: new Date().toISOString()
              } as ResultDTO;

              if (currentAgentDTO) {
                const currentAgent = Agent.fromDTO(currentAgentDTO);
                if(currentAgent.options?.resultEmail) {
                  (async function () {
                    const ReactDOMServer = (await import('react-dom/server')).default

                    const CreateResultEmailTemplate = emailTemplatesLocalized[language].html;
                    const CreateResultEmailTemplatePlain = emailTemplatesLocalized[language].plain;
                    
                    const url = process.env.APP_URL + '/admin/agent/' + currentAgent.id + '/results/' + sessionId;
                    const renderedHtmlTemplate = ReactDOMServer.renderToStaticMarkup(<CreateResultEmailTemplate agent={currentAgentDTO} result={result} resultFormat={format} url={url} userName={existingSessionDTO.userName} userEmail={existingSessionDTO.userEmail}/>)
                    const renderedTextTemplate = ReactDOMServer.renderToStaticMarkup(<CreateResultEmailTemplatePlain agent={currentAgentDTO} result={result} resultFormat={format} url={url} userName={existingSessionDTO.userName} userEmail={existingSessionDTO.userEmail}/>)
        
                    const { data, error } = await resend.emails.send({
                      from: 'Open Agents Builder <results@updates.agentdoodle.com>',
                      to: [currentAgent.options?.resultEmail ?? ''],
                      subject: i18next.t('Open Agents Builder result', { lng: language }),
                      text: renderedTextTemplate,
                      html: renderedHtmlTemplate
                    });
                    console.error(error);
                })();
        
                }
              }
            
              storedResult.updatedAt = new Date().toISOString();
              storedResult.finalizedAt = new Date().toISOString();
              storedResult.content = result;
              storedResult.format = format;      
              await sessionsRepo.upsert({ id: sessionId }, { ...existingSessionDTO, finalizedAt: new Date().toISOString() });
              await resultRepo.upsert({ sessionId }, storedResult);

              const saasContext = await authorizeSaasToken(databaseIdHash); // authorize SaaS context

              if (!existingResult) {
                  auditLog({
                      eventName: 'createResult',
                      diff: JSON.stringify(storedResult),
                      recordLocator: JSON.stringify({ sessionId: existingSessionDTO.id })
                  }, null, {
                    databaseIdHash
                  }, saasContext);
              } else {
                  const changes = existingResult ?  detailedDiff(existingResult, storedResult as ResultDTO) : {};
                  auditLog({
                    eventName: 'updateResult',
                    diff: JSON.stringify(changes),
                    recordLocator: JSON.stringify({ sessionId: existingSessionDTO.id })
                }, null, {
                  databaseIdHash
                }, saasContext);
              }
            
              return 'Results saved!';
            } catch (e) {
              console.error(e);
              return 'Error saving results';
            }
          },
        }),
      }
    }

