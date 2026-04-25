exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Metodă HTTP nepermisă." }),
    };
  }

  const apiKey = process.env.PIDKEY_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Lipsește variabila de mediu PIDKEY_API_KEY." }),
    };
  }

  try {
    const { iid } = JSON.parse(event.body || "{}");
    const iidText = typeof iid === "string" ? iid.trim() : "";

    if (!iidText) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "IID-ul este gol. Introdu un IID valid.",
        }),
      };
    }

    // IID trebuie sa contina doar cifre, cratime sau spatii si sa aiba minim 30 cifre.
    const normalizedIid = iidText.replace(/[-\s]/g, "");
    if (!/^\d+$/.test(normalizedIid) || normalizedIid.length < 30) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "IID invalid. Verifică formatul și încearcă din nou.",
        }),
      };
    }

    const endpoint = `https://pidkey.com/ajax/cidms_api?iids=${encodeURIComponent(
      iidText
    )}&justforcheck=0&apikey=${encodeURIComponent(apiKey)}`;

    const pidkeyResponse = await fetch(endpoint);
    const raw = await pidkeyResponse.text();

    if (!pidkeyResponse.ok) {
      let detailsMessage = "";
      try {
        const detailsJson = JSON.parse(raw);
        detailsMessage =
          detailsJson?.error ||
          detailsJson?.message ||
          detailsJson?.result ||
          detailsJson?.status ||
          "";
      } catch {
        detailsMessage = raw;
      }

      return {
        statusCode: 502,
        body: JSON.stringify({
          error: `API PIDKey a returnat o eroare.${
            detailsMessage ? ` Detalii: ${String(detailsMessage).trim()}` : ""
          }`,
        }),
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "API PIDKey a returnat un răspuns invalid (nu este JSON).",
        }),
      };
    }

    const cid = parsed?.confirmation_id_with_dash;

    if (!cid || typeof cid !== "string") {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error:
            "Nu există CID în răspunsul API (câmpul confirmation_id_with_dash lipsește).",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ cid: cid.trim() }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "A apărut o eroare internă neașteptată pe server.",
      }),
    };
  }
};
