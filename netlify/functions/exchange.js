const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { code, platform, roblox_id } = event.queryStringParameters || {};
    let user = null;

    if (!code || !platform) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing code or platform" }) };
    }

    // ----------------- Roblox -----------------
    if (platform === "roblox") {
      const params = new URLSearchParams();
      params.append("client_id", process.env.ROBLOX_CLIENT_ID);
      params.append("client_secret", process.env.ROBLOX_CLIENT_SECRET);
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      params.append("redirect_uri", `${process.env.BASE_URL}/roblox_callback.html`);

      const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", { method: "POST", body: params });
      const tokenData = await tokenRes.json();
      console.log("Roblox token response:", tokenData);

      if (!tokenData.access_token) {
        return { statusCode: 400, body: JSON.stringify({ error: "No access token returned from Roblox" }) };
      }

      const userRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      console.log("Roblox user info:", userData);

      if (!userData.sub) {
        return { statusCode: 400, body: JSON.stringify({ error: "No user ID returned from Roblox" }) };
      }

      return { statusCode: 200, body: JSON.stringify({ user: { id: userData.sub } }) };
    }

    // ----------------- Discord -----------------
    if (platform === "discord") {
      if (!roblox_id) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing Roblox ID for webhook" }) };
      }

      const params = new URLSearchParams();
      params.append("client_id", process.env.DISCORD_CLIENT_ID);
      params.append("client_secret", process.env.DISCORD_CLIENT_SECRET);
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      params.append("redirect_uri", `${process.env.BASE_URL}/discord_callback.html`);

      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const tokenData = await tokenRes.json();
      console.log("Discord token response:", tokenData);

      if (!tokenData.access_token) {
        return { statusCode: 400, body: JSON.stringify({ error: "No access token returned from Discord" }) };
      }

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      user = await userRes.json();
      console.log("Discord user info:", user);

      // Call webhook
      await fetch(process.env.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Authorization": process.env.WEBHOOK_AUTH,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variables: [
            { name: "roblox_id", variable: "{roblox_id}", value: roblox_id },
            { name: "discord_id", variable: "{discord_id}", value: user.id },
          ],
        }),
      });

      return { statusCode: 200, body: JSON.stringify({ user: { id: user.id } }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown platform" }) };
  } catch (err) {
    console.error("Exchange function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
