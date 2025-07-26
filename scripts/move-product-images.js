require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Environment variables tidak lengkap');
  console.log('Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY ter-set di .env.local');
  process.exit(1);
}

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔑 Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Not set');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function moveProductImages() {
  try {
    console.log('🔄 Memulai proses pemindahan gambar produk...');
    
    // 1. List semua file di root produkimg
    const { data: files, error: listError } = await supabase.storage
      .from('produkimg')
      .list('', {
        limit: 1000,
        offset: 0
      });

    if (listError) {
      console.error('❌ Error listing files:', listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log('ℹ️ Tidak ada file di root produkimg');
      return;
    }

    console.log(`📁 Ditemukan ${files.length} file di root produkimg`);

    // 2. Filter file gambar (exclude folder dan QR code)
    const imageFiles = files.filter(file => {
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
      const isNotQR = !file.name.includes('member-') && !file.name.includes('QR');
      const isNotFolder = !file.name.includes('/');
      return isImage && isNotQR && isNotFolder;
    });

    console.log(`🖼️ Ditemukan ${imageFiles.length} file gambar untuk dipindahkan`);

    if (imageFiles.length === 0) {
      console.log('ℹ️ Tidak ada gambar produk untuk dipindahkan');
      return;
    }

    // 3. Pindahkan setiap file
    let successCount = 0;
    let errorCount = 0;

    for (const file of imageFiles) {
      try {
        console.log(`📤 Memindahkan: ${file.name}`);
        
        // Download file dari root
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('produkimg')
          .download(file.name);

        if (downloadError) {
          console.error(`❌ Error download ${file.name}:`, downloadError);
          errorCount++;
          continue;
        }

        // Upload ke folder produk
        const newPath = `produk/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('produkimg')
          .upload(newPath, downloadData, {
            contentType: file.metadata?.mimetype || 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error(`❌ Error upload ${file.name}:`, uploadError);
          errorCount++;
          continue;
        }

        // Hapus file lama
        const { error: deleteError } = await supabase.storage
          .from('produkimg')
          .remove([file.name]);

        if (deleteError) {
          console.error(`⚠️ Error delete file lama ${file.name}:`, deleteError);
          // Lanjutkan meski delete gagal
        }

        console.log(`✅ Berhasil memindahkan: ${file.name} → ${newPath}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error memindahkan ${file.name}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Hasil pemindahan:');
    console.log(`✅ Berhasil: ${successCount} file`);
    console.log(`❌ Gagal: ${errorCount} file`);
    console.log(`📁 File sekarang tersimpan di: produkimg/produk/`);

  } catch (error) {
    console.error('❌ Error dalam proses pemindahan:', error);
  }
}

// Jalankan script
moveProductImages(); 