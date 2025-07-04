export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // assets binding work
    if (!env.ASSETS) {
      return new Response("'ASSETS' binding is not bound. Please check your wrangler.toml and Cloudflare dashboard.", { status: 500 });
    }

    // For root path or any other path, serve dynamic HTML
    if (pathname === '/' || pathname.startsWith('/?')) {
      const textParam = url.searchParams.get('text') || 'Default Text';
      const codeParam = url.searchParams.get('code') || 'https://workers.cloudflare.com';

      let html;
      try {
        html = await env.ASSETS.fetch(request);
        if (html === null) {
          return new Response("index.html not found.", { status: 404 });
        }
      } catch (e) {
        console.error("Get error for index.html:", e);
        return new Response('Error fetching HTML: ' + e.message, { status: 500 });
      }

      const rewriter = new HTMLRewriter()
        .on('#text-container', {
          element(element) {
            element.setInnerContent(textParam);
          },
        })
        .on('#qr-image', {
          element(element) {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codeParam)}`;
            element.setAttribute('src', qrUrl);
            element.setAttribute('alt', `QR Code for ${codeParam}`);
          },
        })
        .on('#code-value', {
          element(element) {
            element.setInnerContent(codeParam);
          },
        });

      const response = new Response(html, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Robots-Tag': 'noindex, nofollow, noarchive'
          },
      });

      return rewriter.transform(response);
    }

    // If no route matches, return 404
    //return new Response("Not Found", { status: 404 });
    //just treat it as static files
    return env.ASSETS.fetch(request);
  },
};
