# Etapa 1: Compilación de la aplicación
FROM node:18-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Construir la aplicación para producción (Vite usa la carpeta 'dist')
RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx para SPA (React)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos construidos desde la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
