import axios from 'axios';

const api = axios.create({
  // Chemin relatif par defaut : passe par le proxy Vite (/api -> backend local),
  // ce qui fonctionne aussi bien en local qu'a travers un tunnel ngrok.
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('btp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('btp_token');
      localStorage.removeItem('btp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
