import axios from 'axios';

/**
 * Récupère la météo réelle via OpenWeatherAPI
 */
export async function getRealWeather(city) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=fr&appid=${key}`;
    const res = await axios.get(url);
    
    return {
      temp: `${Math.round(res.data.main.temp)}°C`,
      cond: res.data.weather[0].description,
      icon: res.data.weather[0].icon,
      humidity: res.data.main.humidity,
      wind: `${Math.round(res.data.wind.speed * 3.6)} km/h`
    };
  } catch (err) {
    console.error('Weather API error:', err.message);
    return null;
  }
}
