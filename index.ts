import { Hono } from 'https://deno.land/x/hono/mod.ts';
import { serveStatic } from 'https://deno.land/x/hono@v3.3.0/middleware.ts'

const app = new Hono();

app.use('/', serveStatic({ root: './public' }));
app.get('/echo', (c) => {
    return c.text('Hello Deno!')
})

Deno.serve(app.fetch)