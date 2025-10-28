// netlify/functions/exchange.js
const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { code, platform } = event.queryStringParameters || {};

    if (!code || !platform) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing code or platform" }),
      };
    }

    if (platform === "roblox") {
      // Exchange Roblox code for access token
      const params = new URLSearchParams();
      params.append("client_id", process.env.ROBLOX_CLIENT_ID);
      params.append("client_secret", process.env.ROBLOX_CLIENT_SECRET);
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      params.append("redirect_uri", `${process.env.BASE_URL}/roblox_callback.html`);

      const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
        method: "POST",
        body: params,
      });

      const tokenData = await tokenRes.json();
      console.log("Roblox token response:", tokenData);

      if (!tokenData.access_token) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No access token returned from Roblox" }),
        };
      }

      // Fetch user info
      const userRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      console.log("Roblox user info:", userData);

      if (!userData.sub) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No user ID returned from Roblox" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ user: { id: userData.sub } }),
      };
    }

    if (platform === "discord") {
      // Exchange Discord code for access token
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
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No access token returned from Discord" }),
        };
      }

      // Fetch Discord user info
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      console.log("Discord user info:", userData);

      return {
        statusCode: 200,
        body: JSON.stringify({ user: { id: userData.id } }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Unknown platform" }),
    };
  } catch (err) {
    console.error("Exchange function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
