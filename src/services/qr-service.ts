import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface MemberQRData {
  memberId: string;
  name: string;
  phone?: string;
  email?: string;
}

export class QRService {
  private static bucketName = 'produkimg';
  private static folderName = 'QR Code';

  /**
   * Generate QR code untuk member dan upload ke Supabase Storage
   */
  static async generateMemberQR(memberData: MemberQRData): Promise<string> {
    try {
      console.log('🔧 QRService: generateMemberQR called with:', memberData);
      
      const fileName = `member-${memberData.memberId}.png`;
      const filePath = `${this.folderName}/${fileName}`;
      
      console.log('📁 QRService: File path:', filePath);
      
      // Generate QR code sebagai buffer
      console.log('🔄 QRService: Generating QR buffer...');
      const qrBuffer = await QRCode.toBuffer(JSON.stringify(memberData), {
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('✅ QRService: QR buffer generated, size:', qrBuffer.length);

      // Upload ke Supabase Storage
      console.log('📤 QRService: Uploading to Supabase...');
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, qrBuffer, {
          contentType: 'image/png',
          upsert: true // Overwrite jika sudah ada
        });

      if (error) {
        console.error('❌ QRService: Error uploading QR code:', error);
        throw new Error(`Failed to upload QR code: ${error.message}`);
      }

      console.log('✅ QRService: Upload successful');

      // Dapatkan public URL
      console.log('🔗 QRService: Getting public URL...');
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      console.log('✅ QRService: Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ QRService: Error generating member QR:', error);
      throw error;
    }
  }

  /**
   * Dapatkan URL QR code member (jika sudah ada)
   */
  static async getMemberQRUrl(memberId: string): Promise<string | null> {
    try {
      const fileName = `member-${memberId}.png`;
      const filePath = `${this.folderName}/${fileName}`;

      // Cek apakah file sudah ada
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list(this.folderName, {
          search: fileName
        });

      if (error) {
        console.error('Error checking QR code:', error);
        return null;
      }

      if (files && files.length > 0) {
        // File sudah ada, return public URL
        const { data: urlData } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(filePath);
        
        return urlData.publicUrl;
      }

      return null;
    } catch (error) {
      console.error('Error getting member QR URL:', error);
      return null;
    }
  }

  /**
   * Generate atau dapatkan QR code URL untuk member
   */
  static async getOrGenerateMemberQR(memberData: MemberQRData): Promise<string> {
    try {
      console.log('🔧 QRService: getOrGenerateMemberQR called with:', memberData);
      
      // Cek apakah QR code sudah ada
      const existingUrl = await this.getMemberQRUrl(memberData.memberId);
      console.log('🔍 QRService: Existing URL check result:', existingUrl);
      
      if (existingUrl) {
        console.log('✅ QRService: Using existing QR code');
        return existingUrl;
      }

      console.log('🔄 QRService: Generating new QR code');
      // Generate QR code baru
      return await this.generateMemberQR(memberData);
    } catch (error) {
      console.error('❌ QRService: Error in getOrGenerateMemberQR:', error);
      throw error;
    }
  }

  /**
   * Parse QR code data dari string JSON
   */
  static parseMemberData(qrData: string): MemberQRData | null {
    try {
      return JSON.parse(qrData) as MemberQRData;
    } catch (error) {
      console.error('Error parsing member QR data:', error);
      return null;
    }
  }
} 