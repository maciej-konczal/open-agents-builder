import ServerAgentRepository from "@/data/server/server-agent-repository";

export async function GET(request: Request, { params }: { params: { id: string }} ) {
    const recordLocator = params.id;
    const repo = new ServerAgentRepository(request.headers.get('Database-Id-Hash') || '');

    const agent = await repo.findOne(recordLocator);
    return Response.json(agent);
}