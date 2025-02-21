import { NextResponse, type NextRequest } from 'next/server'
import {SignJWT, jwtVerify, type JWTPayload} from 'jose'
import { i18nRouter } from 'next-i18n-router';
import i18nConfig from '@/app/i18nConfig';

export async function middleware(request: NextRequest) {
    if (request.url.indexOf('/api/') > 0) {
        const authorizationHeader = request.headers.get('Authorization');
        const jwtToken = authorizationHeader?.replace('Bearer ', '');

        if (!jwtToken) {
            return NextResponse.json({ message: 'Unauthorized', status: 401 }, { status: 401 });
        } else {
            try {
                const decoded = await jwtVerify(jwtToken, new TextEncoder().encode(process.env.NEXT_PUBLIC_TOKEN_SECRET || 'Jeipho7ahchue4ahhohsoo3jahmui6Ap'));
                const checkDbHeader = request.headers.get('database-id-hash') === decoded.payload.databaseIdHash;

                if(!checkDbHeader) {
                    return NextResponse.json({ message: 'Unauthorized', status: 401 }, { status: 401 });
                }

            } catch (error) {
                console.log(error);
                return NextResponse.json({ message: 'Unauthorized', status: 401 }, { status: 401 });
            }

        }
    } else {
        return i18nRouter(request, i18nConfig);
    }


}
 
export const config = {
  matcher: '/((?!api/db|api/chat|api/saas|api/agent/results-chat|content|img|_next/image|_next/static|static|.*\\..*|_next).*)',
  //matcher: ['/((?!api/db|storage|agent|dashboard|chat|api/saas|_next/static|content|_next/image|img|onboarding|manifest|favicon.ico|$).*)'],
}