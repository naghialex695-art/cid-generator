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
    const { imageBase64 } = JSON.parse(event.body || "{}");

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "imageBase64 is required." }),
      };
    }

    const formData = new URLSearchParams();
    formData.set("base64_string", imageBase64.trim());
    formData.set("apikey", apiKey);

    const pidkeyResponse = await fetch(
      "https://pidkey.com/ajax/cidms_via_image_base64_string_api",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

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
