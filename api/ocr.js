const crypto = require("crypto");

const DEFAULT_REGION = "cn-north-1";
const DEFAULT_SERVICE = "cv";
const DEFAULT_HOST = "visual.volcengineapi.com";
const DEFAULT_ACTION = "OCRPdf";
const DEFAULT_VERSION = "2021-08-23";
const DEFAULT_MODEL_VERSION = "v3";

function readEnv(names) {
  for (const name of names) {
    if (process.env[name]) {
      return process.env[name];
    }
  }
  return "";
}

function getConfig() {
  return {
    accessKeyId: readEnv(["VOLCENGINE_ACCESS_KEY_ID", "OCR_ACCESS_KEY_ID", "ACCESS_KEY_ID", "accessKeyId"]),
    secretAccessKey: readEnv(["VOLCENGINE_SECRET_ACCESS_KEY", "OCR_SECRET_ACCESS_KEY", "SECRET_ACCESS_KEY", "secretAccessKey"]),
    region: readEnv(["VOLCENGINE_REGION", "OCR_REGION"]) || DEFAULT_REGION,
    service: readEnv(["VOLCENGINE_SERVICE", "OCR_SERVICE"]) || DEFAULT_SERVICE,
    host: readEnv(["VOLCENGINE_HOST", "OCR_HOST"]) || DEFAULT_HOST,
    action: readEnv(["VOLCENGINE_OCR_ACTION", "OCR_ACTION"]) || DEFAULT_ACTION,
    apiVersion: readEnv(["VOLCENGINE_OCR_VERSION", "OCR_VERSION"]) || DEFAULT_VERSION,
    modelVersion: readEnv(["VOLCENGINE_OCR_MODEL_VERSION", "OCR_MODEL_VERSION"]) || DEFAULT_MODEL_VERSION,
  };
}

function sha256Hex(message) {
  return crypto.createHash("sha256").update(message).digest("hex");
}

function hmacSha256Raw(key, message) {
  return crypto.createHmac("sha256", key).update(message).digest();
}

function hmacSha256Hex(key, message) {
  return crypto.createHmac("sha256", key).update(message).digest("hex");
}

function getRequestTimeParts(now = new Date()) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const requestDate = `${iso.slice(0, 8)}T${iso.slice(9, 15)}Z`;
  return {
    requestDate,
    shortDate: requestDate.slice(0, 8),
  };
}

function encodeSortedQuery(params) {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
}

function buildVolcengineAuthorization({ body, queryString, config }) {
  const { requestDate, shortDate } = getRequestTimeParts();
  const payloadHash = sha256Hex(body);
  const canonicalHeaders =
    `content-type:application/x-www-form-urlencoded\n` +
    `host:${config.host}\n` +
    `x-content-sha256:${payloadHash}\n` +
    `x-date:${requestDate}\n`;
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalRequest = ["POST", "/", queryString, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${shortDate}/${config.region}/${config.service}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    requestDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256Raw(config.secretAccessKey, shortDate);
  const kRegion = hmacSha256Raw(kDate, config.region);
  const kService = hmacSha256Raw(kRegion, config.service);
  const kSigning = hmacSha256Raw(kService, "request");
  const signature = hmacSha256Hex(kSigning, stringToSign);

  return {
    requestDate,
    payloadHash,
    authorization:
      `HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const config = getConfig();
  if (!config.accessKeyId || !config.secretAccessKey) {
    res.status(500).json({ error: "Missing OCR credentials in Vercel environment variables." });
    return;
  }

  const imageBase64 = typeof req.body?.imageBase64 === "string" ? req.body.imageBase64 : "";
  const isPdf = Boolean(req.body?.isPdf);

  if (!imageBase64) {
    res.status(400).json({ error: "Missing imageBase64." });
    return;
  }

  try {
    const queryString = encodeSortedQuery({
      Action: config.action,
      Version: config.apiVersion,
    });

    const body = new URLSearchParams({
      image_base64: imageBase64,
      version: config.modelVersion,
      file_type: isPdf ? "pdf" : "image",
      parse_mode: "auto",
      table_mode: "markdown",
      filter_header: "true",
      page_start: "0",
      page_num: "16",
    }).toString();

    const auth = buildVolcengineAuthorization({
      body,
      queryString,
      config,
    });

    const response = await fetch(`https://${config.host}/?${queryString}`, {
      method: "POST",
      headers: {
        Authorization: auth.authorization,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Content-Sha256": auth.payloadHash,
        "X-Date": auth.requestDate,
      },
      body,
    });

    const text = await response.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch (error) {
      res.status(502).json({ error: "OCR returned invalid JSON.", raw: text });
      return;
    }

    if (!response.ok) {
      res.status(response.status).json(payload);
      return;
    }

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown OCR proxy error.",
    });
  }
};
