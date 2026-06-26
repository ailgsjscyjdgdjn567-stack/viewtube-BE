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
    // Получаем base64 аудио из тела запроса
    const { audioBase64, mimeType, ext } = JSON.parse(event.body);
    if (!audioBase64) throw new Error('Нет аудио данных');

    // Конвертируем base64 обратно в Buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Создаём FormData для Whisper
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.' + (ext || 'mp4'), contentType: mimeType || 'video/mp4' });
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.OPENAI_KEY,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'Ошибка Whisper');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        segments: data.segments || [],
        text: data.text || ''
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
