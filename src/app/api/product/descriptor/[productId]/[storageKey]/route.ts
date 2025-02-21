import { Agent, Attachment } from '@/data/client/models';
import { AgentDTO, AttachmentDTO, productDTOSchema, ResultDTO, StatDTO } from '@/data/dto';
import ServerAgentRepository from '@/data/server/server-agent-repository';
import ServerAttachmentRepository from '@/data/server/server-attachment-repository';
import ServerProductRepository from '@/data/server/server-product-repository';
import ServerResultRepository from '@/data/server/server-result-repository';
import ServerStatRepository from '@/data/server/server-stat-repository';
import { authorizeSaasContext } from '@/lib/generic-api';
import { llmProviderSetup } from '@/lib/llm-provider';
import { renderPrompt } from '@/lib/prompt-template';
import { validateTokenQuotas } from '@/lib/quotas';
import { StorageService } from '@/lib/storage-service';
import { getErrorMessage } from '@/lib/utils';
import { createCalendarListTool } from '@/tools/calendarListTool';
import { createCalendarScheduleTool } from '@/tools/calendarScheduleTool';
import { createUpdateResultTool } from '@/tools/updateResultTool';
import { CoreMessage, generateObject, generateText, streamText } from 'ai';
import { NextRequest } from 'next/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: { storageKey: string, productId: string } }) {
  const databaseIdHash = req.headers.get('Database-Id-Hash');
  const locale = req.headers.get('Agent-Locale') || 'en';

  if(!databaseIdHash ) {
    return Response.json('The required HTTP headers: Database-Id-Hash and Agent-Id missing', { status: 400 });
  }

  const saasContext = await authorizeSaasContext(req);

  if (saasContext?.isSaasMode) {
      if (!saasContext.hasAccess) {
          return Response.json({ message: "Unauthorized", status: 403 }, { status: 403 });
      } else {

          if (saasContext.saasContex) {
              const resp = await validateTokenQuotas(saasContext.saasContex)
              if (resp?.status !== 200) {
                  return Response.json(resp)
              }
          } else {
              return Response.json({ message: "Unauthorized", status: 403 }, { status: 403 });
          }
      }
  }

  const attRepo = new ServerAttachmentRepository(databaseIdHash, 'commerce');
  const prodRepo = new ServerProductRepository(databaseIdHash, 'commerce');

  const attachment = Attachment.fromDTO(await attRepo.findOne({storageKey: params.storageKey}) as AttachmentDTO);  
  const product = await prodRepo.findOne({id: params.productId});

  if (!attachment || !attachment.mimeType?.startsWith('image')) {
    return Response.json({ message: "Invalid attachment", status: 400 }, { status: 400 });
  }

  if (!product) {
    return Response.json({ message: "Invalid product", status: 400 }, { status: 400 });
  }

  const srv: StorageService = new StorageService(databaseIdHash, 'commerce');
  const imageContent = srv.readAttachment(attachment.storageKey);

  const systemPrompt = await renderPrompt(locale, 'describe-product', { product });

  try {
    const { object }  = await generateObject({
      model: llmProviderSetup(),
      maxSteps: 10,  
      prompt: systemPrompt,
      messages: [
        {
          content: systemPrompt,
          role: 'user',          
        },
        {
          type: 'image',
          image: `data:${attachment.mimeType};base64,${Buffer.from(imageContent).toString('base64')}`
        },
        {
          type: 'text',
          content: JSON.stringify(product)
        }
      ] as CoreMessage[],
      schema: productDTOSchema,
      async onFinish({ response, usage }) {
      
        const usageData:StatDTO = {
          eventName: 'chat',
          completionTokens: usage.completionTokens,
          promptTokens: usage.promptTokens,
          createdAt: new Date().toISOString()
      }
        const statsRepo = new ServerStatRepository(databaseIdHash, 'stats');
        const result = await statsRepo.aggregate(usageData)

        const saasContext = await authorizeSaasContext(req);
        if (saasContext.apiClient) {
            saasContext.apiClient.saveStats(databaseIdHash, {
                ...result,
                databaseIdHash: databaseIdHash
            });
      }        

      },    
    });
    console.log(object)
    return object
  } catch (error) {
    console.error('Error streaming text:', getErrorMessage(error));
    return Response.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}