import { SessionDTO } from "@/data/dto";
import ServerSessionRepository from "@/data/server/server-session-repository";

export async function POST(request: Request, { params }: { params: { id: string }} ) {
    const { id } = params;
    const { agentId, userName, email, acceptTerms } = await request.json();
    const sessionRepo = new ServerSessionRepository(request.headers.get('Database-Id-Hash') || '');


      const savedSession = await sessionRepo.upsert({
        id
      }, {
        id,
        agentId,
        user: JSON.stringify({
            name: userName,
            email
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as SessionDTO);


    const agent = await repo.findOne(recordLocator);
    return Response.json(agent);
}