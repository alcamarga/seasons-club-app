// Configuración de desarrollo: el proxy de ng serve reenvía /api al backend Flask | Dev config: dev server proxy forwards /api to Flask backend
export const environment = {
  produccion: false,
  apiUrl: 'http://localhost:5000/api',
};
