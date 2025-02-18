import { Mail } from "lucide-react";

export function SessionHeader ({ session }: { session: { userName?: string | undefined | null, userEmail?: string | undefined | null} }) {
    return (
        <div className="col-span-2 flex justify-between items-center mb-2">
        {session.userName ? (<h2 className="text-lg font-semibold">{session.userName}</h2>) : null}
        {session.userEmail ? (
        <a href={`mailto:${session.userEmail}`} className="text-primary hover:underline flex items-center">
            <Mail className="w-4 h-4 mr-1" />
            {session.userEmail}
        </a>
        ) : null}
    </div>
    )
}