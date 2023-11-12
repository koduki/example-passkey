docker run --rm -it -v `pwd`:/app -p 8000:8000 denoland/deno bash

/app # deno run --allow-net --allow-read --watch index.ts
Listening on http://localhost:8000/
