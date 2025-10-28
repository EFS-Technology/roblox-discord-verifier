const fetch = require('node-fetch');

exports.handler = async function(event) {
  try {
    const { platform, code, roblox_id } = event.queryStringParameters || {};
    let user = null;

    if (!platform || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing platform or code" })
      };
    }

    if (platform === "roblox") {
      // Exchange Roblox code for access token
      const tokenRes = await fetch('https://apis.roblox.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: process.env.ROBLOX_CLIENT_ID,
          client_secret: process.env.ROBLOX_CLIENT_SECRET,
          redirect_uri: `${process.env.BASE_URL}/roblox_callback.html`
        })
      });

      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Failed to get Roblox access token", tokenData })
        };
      }

      // Get Roblox user info
      const userRes = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      user = await userRes.json();

    } else if (platform === "discord") {
      if (!roblox_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing Roblox ID for webhook" })
        };
      }

      // Exchange Discord code for access token
      const params = new URLSearchParams();
      params.append('client_id', process.env.DISCORD_CLIENT_ID);
      params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', `${process.env.BASE_URL}/discord_callback.html`);

      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Failed to get Discord access token", tokenData })
        };
      }

      // Get Discord user info
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      user = await userRes.json();

      // Trigger BotGhost webhook
      await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Authorization': process.env.WEBHOOK_AUTH,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variables: [
            { name: "roblox_id", variable: "{roblox_id}", value: roblox_id },
            { name: "discord_id", variable: "{discord_id}", value: user.id }
          ]
        })
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ user })
    };

  } catch (err) {
    console.error("Exchange function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", details: err.message })
    };
  }
};
