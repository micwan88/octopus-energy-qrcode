export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Ensure the KV namespace is bound
    if (!env.STATIC_ASSETS_KV) {
      return new Response("KV Namespace 'STATIC_ASSETS_KV' is not bound. Please check your wrangler.toml and Cloudflare dashboard.", { status: 500 });
    }

    // Serve static assets from KV
    if (pathname === '/Untitled.png') {
      try {
        const image = await env.STATIC_ASSETS_KV.get("Untitled.png", { type: "arrayBuffer" });
        if (image === null) {
          return new Response("Untitled.png not found in KV store.", { status: 404 });
        }
        return new Response(image, { headers: { 'Content-Type': 'image/png' } });
      } catch (e) {
        console.error("KV get error for Untitled.png:", e);
        return new Response('Error fetching image from KV: ' + e.message, { status: 500 });
      }
    } else if (pathname === '/style.css') {
      try {
        const css = await env.STATIC_ASSETS_KV.get("style.css", { type: "text" });
        if (css === null) {
          return new Response("style.css not found in KV store.", { status: 404 });
        }
        return new Response(css, { headers: { 'Content-Type': 'text/css;charset=UTF-8' } });
      } catch (e) {
        console.error("KV get error for style.css:", e);
        return new Response('Error fetching CSS from KV: ' + e.message, { status: 500 });
      }
    }

    // For root path or any other path, serve dynamic HTML
    if (pathname === '/' || pathname.startsWith('/?')) {
      const textParam = url.searchParams.get('text') || 'Default Text';
      const codeParam = url.searchParams.get('code') || 'https://workers.cloudflare.com';

      let html;
      try {
        html = await env.STATIC_ASSETS_KV.get("index.html");
        if (html === null) {
          return new Response("index.html not found in KV store.", { status: 404 });
        }
      } catch (e) {
        console.error("KV get error for index.html:", e);
        return new Response('Error fetching HTML from KV: ' + e.message, { status: 500 });
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
    return new Response("Not Found", { status: 404 });
  },
};
