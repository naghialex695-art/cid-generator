exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.PIDKEY_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing PIDKEY_API_KEY environment variable." }),
    };
  }

  try {
    const { iid } = JSON.parse(event.body || "{}");

    if (!iid || typeof iid !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "IID is required." }),
      };
    }

    const endpoint = `https://pidkey.com/ajax/cidms_api?iids=${encodeURIComponent(
      iid.trim()
    )}&justforcheck=0&apikey=${encodeURIComponent(apiKey)}`;

    const pidkeyResponse = await fetch(endpoint);
    const raw = await pidkeyResponse.text();

    if (!pidkeyResponse.ok) {
      return {
        statusCode: pidkeyResponse.status,
        body: JSON.stringify({ error: "PIDKey request failed.", details: raw }),
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const cid = parsed?.cid || parsed?.CID || parsed?.data?.cid || parsed?.data?.CID;

    return {
      statusCode: 200,
      body: JSON.stringify({
        cid: cid || raw,
        source: parsed ? "json" : "text",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unexpected server error." }),
    };
  }
};
