import { Hono } from 'https://deno.land/x/hono/mod.ts';
import { serveStatic } from 'https://deno.land/x/hono@v3.3.0/middleware.ts'

const app = new Hono();

app.use('/*', serveStatic({ root: './public' }));
// app.use('/static/*', serveStatic({ root: './public/static' }));

app.get('/signup', serveStatic({ path: './public/signup.html' }));
app.get('/profile', serveStatic({ path: './public/profile.html' }));

app.get('/echo', (c) => {
    return c.text('Hello Deno!')
})

Deno.serve(app.fetch)