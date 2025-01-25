import { Session } from "@/data/client/models";
import { SessionDTO } from "@/data/dto";
import ServerSessionRepository from "@/data/server/server-session-repository";
import { getErrorMessage } from "@/lib/utils";


// create new session or return the existing one - do not allow to override the session inital data if created
export async function POST(request: Request, { params }: { params: { id: string }} ) {
    try {
        const { id } = params;
        const { agentId, userName, userEmail, acceptTerms } = await request.json();
        const sessionRepo = new ServerSessionRepository(request.headers.get('Database-Id-Hash') || '');
console.log(params, id)

        if(!id) {
            return Response.json({ message: "Invalid request, no id provided within request url", status: 400 }, {status: 400});
        }

        if(!agentId || !userName || !userEmail) {
            return Response.json({ message: "Invalid request, missing required fields", status: 400 }, {status: 400});
        }

        const existingSession = await sessionRepo.findOne({ id });

        if (existingSession) {
            return Response.json({ message: "Session already exists", data: { id: existingSession.id }}, { status: 200 });
        }

        const savedSession = await sessionRepo.create({
            id,
            agentId,
            user: JSON.stringify({
                name: userName,
                email: userEmail
            }),
            acceptTerms: acceptTerms === 'true' ? 'true' : 'false',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as SessionDTO);

        return Response.json({ message: "Session created", data: { id: savedSession.id }, status: 200 }); // do not return the session data as it contains personal information so getting the session id user would be able to retrieve it's personal data


    } catch (error) {
        console.error(error);
        return Response.json({ message: `Invalid request ${getErrorMessage(error)}`, status: 400 }, {status: 400});
    }
}