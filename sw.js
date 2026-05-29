const CACHE_NAME = "kuailebozi-media-v1";
const MEDIA_PATHS = [
  "assets/media/CH0295_home_Start_Idle_01.webm",
  "assets/media/CH0295_home_Idle_01.webm",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(MEDIA_PATHS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(() =>
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          client.navigate(client.url);
        });
      })
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const mediaPath = MEDIA_PATHS.find((path) => url.pathname.endsWith(`/${path}`));

  if (!mediaPath) {
    return;
  }

  event.respondWith(handleMediaRequest(event.request, mediaPath));
});

async function handleMediaRequest(request, mediaPath) {
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(mediaPath);

  if (!response) {
    response = await fetch(request);
    await cache.put(mediaPath, response.clone());
  }

  const range = request.headers.get("range");
  if (!range) {
    return response;
  }

  const blob = await response.blob();
  const match = range.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return response;
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : blob.size - 1;
  const sliced = blob.slice(start, end + 1);

  return new Response(sliced, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(sliced.size),
      "Content-Range": `bytes ${start}-${end}/${blob.size}`,
      "Content-Type": response.headers.get("Content-Type") || "video/webm",
    },
  });
}
