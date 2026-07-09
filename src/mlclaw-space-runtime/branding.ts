export type RuntimeBranding = {
  name: string;
  shortName: string;
  themeColor: string;
  logoAsset: string;
  faviconSvgAsset: string;
  favicon32Asset: string;
  faviconIcoAsset: string;
  appleTouchIconAsset: string;
};

export type PublicBranding = {
  name: string;
  shortName: string;
  themeColor: string;
  logoUrl: string;
};

const DEFAULT_BRAND_NAME = "ML Claw";
const DEFAULT_THEME_COLOR = "#111827";
const DEFAULT_LOGO_ASSET = "mlclaw.svg";
const DEFAULT_HUGGING_FACE_ASSET = "hf-logo.svg";
const DEFAULT_ASSISTANT_AVATAR_ASSET = "assistant-avatar.svg";

export function resolveBranding(
  env: NodeJS.ProcessEnv,
  agentName: string | undefined,
): RuntimeBranding {
  const defaultName = defaultBrandName(agentName);
  const name = cleanText(env.MLCLAW_BRAND_NAME) ?? defaultName;
  return {
    name,
    shortName: cleanText(env.MLCLAW_BRAND_SHORT_NAME) ?? name,
    themeColor: normalizeThemeColor(env.MLCLAW_BRAND_THEME_COLOR) ?? DEFAULT_THEME_COLOR,
    logoAsset: normalizeAssetRef(env.MLCLAW_BRAND_LOGO, DEFAULT_LOGO_ASSET),
    faviconSvgAsset: normalizeAssetRef(
      env.MLCLAW_BRAND_FAVICON_SVG ?? env.MLCLAW_BRAND_FAVICON,
      DEFAULT_HUGGING_FACE_ASSET,
    ),
    favicon32Asset: normalizeAssetRef(
      env.MLCLAW_BRAND_FAVICON_32 ?? env.MLCLAW_BRAND_FAVICON_PNG ?? env.MLCLAW_BRAND_FAVICON,
      DEFAULT_HUGGING_FACE_ASSET,
    ),
    faviconIcoAsset: normalizeAssetRef(
      env.MLCLAW_BRAND_FAVICON_ICO ?? env.MLCLAW_BRAND_FAVICON,
      DEFAULT_HUGGING_FACE_ASSET,
    ),
    appleTouchIconAsset: normalizeAssetRef(
      env.MLCLAW_BRAND_APPLE_TOUCH_ICON ?? env.MLCLAW_BRAND_ASSISTANT_AVATAR,
      DEFAULT_ASSISTANT_AVATAR_ASSET,
    ),
  };
}

export function publicBranding(branding: RuntimeBranding): PublicBranding {
  return {
    name: branding.name,
    shortName: branding.shortName,
    themeColor: branding.themeColor,
    logoUrl: "/assets/brand/logo",
  };
}

export function brandingManifest(branding: RuntimeBranding): string {
  return `${JSON.stringify({
    name: branding.name,
    short_name: branding.shortName,
    description: `${branding.name} browser gateway`,
    start_url: "./",
    display: "standalone",
    theme_color: branding.themeColor,
    background_color: branding.themeColor,
    icons: [
      {
        src: "./favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "./favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "./apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }, null, 2)}\n`;
}

function defaultBrandName(agentName: string | undefined): string {
  const cleaned = cleanText(agentName);
  if (!cleaned) {
    return DEFAULT_BRAND_NAME;
  }
  if (/^mlclaw$/i.test(cleaned)) {
    return DEFAULT_BRAND_NAME;
  }
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => /^mlclaw$/i.test(word)
      ? DEFAULT_BRAND_NAME
      : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function cleanText(value: string | undefined): string | undefined {
  const cleaned = value
    ?.replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, 80) : undefined;
}

function normalizeThemeColor(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  if (!cleaned) {
    return undefined;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned.slice(1).split("").map((char) => `${char}${char}`).join("")}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned.toLowerCase();
  }
  throw new Error("MLCLAW_BRAND_THEME_COLOR must be a #rgb or #rrggbb color");
}

function normalizeAssetRef(value: string | undefined, fallback: string): string {
  const raw = value?.trim() || fallback;
  const withoutAssetsPrefix = raw.replace(/^\/?assets\/+/, "");
  const normalized = withoutAssetsPrefix
    .split("/")
    .filter(Boolean)
    .join("/");
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.startsWith("/")
  ) {
    throw new Error(`brand asset path must stay inside the Space assets directory: ${raw}`);
  }
  return normalized;
}
