# Gunakan base image Node.js versi 18 yang ringan
FROM node:18-alpine

# Tentukan direktori kerja di dalam container
WORKDIR /app

# Salin file package.json dan package-lock.json dari folder server
COPY server/package*.json ./

# Install dependensi produksi secara efisien
RUN npm ci --only=production

# Salin sisa file aplikasi dari folder server
COPY server/ .

# Expose port yang digunakan oleh server Anda
EXPOSE 3001

# Perintah untuk menjalankan aplikasi saat container dimulai
CMD ["npm", "start"]