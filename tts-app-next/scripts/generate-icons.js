#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configurações dos ícones para Android
const iconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

// Caminhos
const sourceImage = path.join(__dirname, '../images/logo_museu_ccen.png');
const androidResPath = path.join(__dirname, '../android/app/src/main/res');

async function generateIcons() {
  try {
    console.log('🎨 Gerando ícones do APK...');
    
    // Verificar se a imagem fonte existe
    if (!fs.existsSync(sourceImage)) {
      throw new Error(`Imagem fonte não encontrada: ${sourceImage}`);
    }

    // Gerar ícones para cada resolução
    for (const [folder, size] of Object.entries(iconSizes)) {
      const folderPath = path.join(androidResPath, folder);
      
      // Criar pasta se não existir
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Gerar ícone principal
      const iconPath = path.join(folderPath, 'ic_launcher.png');
      await sharp(sourceImage)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(iconPath);
      
      console.log(`✅ Gerado: ${iconPath} (${size}x${size})`);

      // Gerar ícone round (mesmo arquivo para simplicidade)
      const iconRoundPath = path.join(folderPath, 'ic_launcher_round.png');
      await sharp(sourceImage)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(iconRoundPath);
      
      console.log(`✅ Gerado: ${iconRoundPath} (${size}x${size})`);

      // Gerar ícone foreground (para adaptive icons)
      const iconForegroundPath = path.join(folderPath, 'ic_launcher_foreground.png');
      await sharp(sourceImage)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(iconForegroundPath);
      
      console.log(`✅ Gerado: ${iconForegroundPath} (${size}x${size})`);
    }

    console.log('🎉 Todos os ícones foram gerados com sucesso!');
    console.log('📱 Agora você pode compilar o APK com o novo ícone.');
    
  } catch (error) {
    console.error('❌ Erro ao gerar ícones:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };
