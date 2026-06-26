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
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.YANDEX_CLIENT_ID,
      client_secret: process.env.YANDEX_CLIENT_SECRET
    });

    const tokenResp = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const tokenData = await tokenResp.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const accessToken = tokenData.access_token;

    // Получить данные пользователя
    const userResp = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { 'Authorization': 'OAuth ' + accessToken }
    });
    const userData = await userResp.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: String(userData.id),
        username: userData.login,
        displayName: userData.real_name || userData.display_name || userData.login,
        email: userData.default_email || '',
        avatar: userData.default_avatar_id
          ? `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200`
          : '',
        provider: 'yandex'
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
