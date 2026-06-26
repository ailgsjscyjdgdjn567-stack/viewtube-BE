exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { code } = JSON.parse(event.body);
    if (!code) throw new Error('Нет code');

    // Обменять code на access_token
    const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenResp.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const accessToken = tokenData.access_token;

    // Получить данные пользователя
    const userResp = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    const userData = await userResp.json();

    // Получить email если не публичный
    let email = userData.email;
    if (!email) {
      const emailResp = await fetch('https://api.github.com/user/emails', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      const emails = await emailResp.json();
      const primary = emails.find(e => e.primary && e.verified);
      email = primary?.email || '';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: String(userData.id),
        username: userData.login,
        displayName: userData.name || userData.login,
        email,
        avatar: userData.avatar_url,
        provider: 'github'
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
