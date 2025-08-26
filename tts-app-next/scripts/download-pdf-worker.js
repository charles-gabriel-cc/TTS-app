const https = require('https');
const fs = require('fs');
const path = require('path');

// URL do worker do PDF.js
const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const outputPath = path.join(__dirname, '../public/pdf.worker.min.js');

console.log('Baixando PDF.js worker...');

https.get(workerUrl, (response) => {
  if (response.statusCode === 200) {
    const file = fs.createWriteStream(outputPath);
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log('PDF.js worker baixado com sucesso!');
    });
  } else {
    console.error('Erro ao baixar worker:', response.statusCode);
  }
}).on('error', (err) => {
  console.error('Erro ao baixar worker:', err.message);
});
