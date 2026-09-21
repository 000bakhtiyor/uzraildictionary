import { registerAs } from '@nestjs/config';

export default registerAs('tilmoch', () => ({
  apiKey: process.env.TILMOCH_API_KEY,
  apiUrl: process.env.TILMOCH_API_URL || 'https://websocket.tahrirchi.uz/translate-v2',
  model: process.env.TILMOCH_MODEL || 'tilmoch',
}));