# Imagen base
FROM node:18

# Crear directorio de trabajo
WORKDIR /app

# Copiar dependencias y paquetes
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de la API
EXPOSE 3000

# Comando para iniciar el servidor (puede ser dev o start)
CMD ["npm", "run", "dev"]
