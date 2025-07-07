
// src/app/oauth/[...oidc]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getOidcProvider } from '@/lib/oidc';

async function handler(req: NextRequest) {
  const provider = await getOidcProvider();
  
  // The oidc-provider library expects a Koa-like context, but we can adapt
  // Next.js's request and response objects to work with it.
  const request = {
    ...req,
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
    // A simple mock for Koa's context `req` property
    req: {
        method: req.method,
        url: req.nextUrl.pathname + req.nextUrl.search,
        headers: Object.fromEntries(req.headers),
        body: req.body,
    },
    // The provider needs a way to set headers, status, and body on the response.
    // We will capture these and use them to build our NextResponse.
    res: {
      headers: new Headers(),
      body: undefined as any,
      status: 200,

      setHeader(name: string, value: string | string[]) {
        if (Array.isArray(value)) {
          // This logic might need to be more robust for multiple headers of same name
          this.headers.set(name, value.join(', '));
        } else {
          this.headers.set(name, value);
        }
      },
      set(name: string, value: string | string[]) {
        this.setHeader(name, value);
      },
      status(code: number) {
        this.status = code;
      },
      end(body?: any) {
        if (body) this.body = body;
      },
    },
  };
  
  // The provider's callback function handles all OIDC routes.
  const callback = provider.callback();
  
  // @ts-ignore - We are adapting NextRequest to a Koa-like context
  await callback(request, request.res);

  // Construct the NextResponse from the captured response properties
  return new NextResponse(request.res.body, {
    status: request.res.status,
    headers: request.res.headers,
  });
}

export { handler as GET, handler as POST };
