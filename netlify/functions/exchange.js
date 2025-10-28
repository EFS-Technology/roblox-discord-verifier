export async function handler(event) {
  const { platform, code, roblox_id } = event.queryStringParameters;

  if (platform === "roblox") {
    const response = await fetch("https://apis.roblox.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.ROBLOX_CLIENT_ID,
        client_secret: process.env.ROBLOX_CLIENT_SECRET,
        redirect_uri: process.env.BASE_URL + "/roblox_callback.html",
      }),
    });
    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify({ user: { id: data.user_id } }) };
  }

  if (platform === "discord") {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.BASE_URL + "/discord_callback.html",
      }),
    });

    const discordData = await response.json();

    // Send webhook
    await fetch(process.env.WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Authorization": process.env.WEBHOOK_AUTH,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        variables: [
          { name: "roblox_id", value: roblox_id },
          { name: "discord_id", value: discordData.user.id },
        ],
      }),
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 400, body: "Invalid platform" };
}
