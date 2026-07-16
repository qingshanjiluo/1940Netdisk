/**
 * Middleware for error handling and optional Sentry telemetry.
 *
 * Sentry packages (@cloudflare/pages-plugin-sentry, @sentry/tracing) are
 * loaded dynamically and gracefully skipped if not installed or at runtime.
 * This prevents build failures on Cloudflare Pages deployments where
 * node_modules may not be present.
 */

// Cache for sentry plugin availability (null=unchecked, object=loaded, null=failed)
let sentryPluginModule = null;
let sentryResolved = false;

async function getSentryPlugin() {
  if (sentryResolved) {
    return sentryPluginModule;
  }
  sentryResolved = true;
  try {
    const mod = await import("@cloudflare/pages-plugin-sentry");
    await import("@sentry/tracing");
    sentryPluginModule = mod.default;
    console.log("[sentry] plugin loaded successfully");
  } catch (e) {
    console.log("[sentry] not available, telemetry disabled:", e.message);
    sentryPluginModule = null;
  }
  return sentryPluginModule;
}

export async function errorHandling(context) {
  const env = context.env;
  if (typeof env.disable_telemetry == "undefined" || env.disable_telemetry == null || env.disable_telemetry == "") {
    context.data.telemetry = true;
    let remoteSampleRate = 0.001;
    try {
      const sampleRate = await fetchSampleRate(context);
      console.log("sampleRate", sampleRate);
      if (sampleRate) {
        remoteSampleRate = sampleRate;
      }
    } catch (e) { console.log(e) }
    const sampleRate = env.sampleRate || remoteSampleRate;
    console.log("sampleRate", sampleRate);

    const plugin = await getSentryPlugin();
    if (plugin) {
      return plugin({
        dsn: "https://219f636ac7bde5edab2c3e16885cb535@o4507041519108096.ingest.us.sentry.io/4507541492727808",
        tracesSampleRate: sampleRate,
      })(context);
    }
    // If sentry plugin is unavailable, proceed without telemetry
  }
  return context.next();
}

export function telemetryData(context) {
  const env = context.env;
  if (typeof env.disable_telemetry == "undefined" || env.disable_telemetry == null || env.disable_telemetry == "") {
    // If sentry wasn't initialized (plugin unavailable), skip telemetry collection
    if (!context.data.sentry) {
      return context.next();
    }
    try {
      const parsedHeaders = {};
      context.request.headers.forEach((value, key) => {
        parsedHeaders[key] = value;
        if (value.length > 0) {
          context.data.sentry.setTag(key, value);
        }
      });
      const CF = JSON.parse(JSON.stringify(context.request.cf));
      const parsedCF = {};
      for (const key in CF) {
        if (typeof CF[key] == "object") {
          parsedCF[key] = JSON.stringify(CF[key]);
        } else {
          parsedCF[key] = CF[key];
          if (CF[key].length > 0) {
            context.data.sentry.setTag(key, CF[key]);
          }
        }
      }
      const data = {
        headers: parsedHeaders,
        cf: parsedCF,
        url: context.request.url,
        method: context.request.method,
        redirect: context.request.redirect,
      }
      const urlPath = new URL(context.request.url).pathname;
      const hostname = new URL(context.request.url).hostname;
      context.data.sentry.setTag("path", urlPath);
      context.data.sentry.setTag("url", data.url);
      context.data.sentry.setTag("method", context.request.method);
      context.data.sentry.setTag("redirect", context.request.redirect);
      context.data.sentry.setContext("request", data);
      const transaction = context.data.sentry.startTransaction({ name: `${context.request.method} ${hostname}` });
      context.data.transaction = transaction;
      return context.next();
    } catch (e) {
      console.log(e);
    } finally {
      if (context.data.transaction) {
        context.data.transaction.finish();
      }
    }
  }
  return context.next();
}

export async function traceData(context, span, op, name) {
  const data = context.data;
  if (data.telemetry) {
    if (span) {
      console.log("span finish");
      span.finish();
    } else {
      if (!data.transaction) return;
      console.log("span start");
      span = await context.data.transaction.startChild(
        { op: op, name: name },
      );
    }
  }
}

async function fetchSampleRate(context) {
  const data = context.data
  if (data.telemetry) {
    const url = "https://frozen-sentinel.pages.dev/signal/sampleRate.json";
    const response = await fetch(url);
    const json = await response.json();
    return json.rate;
  }
}