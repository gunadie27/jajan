import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface MemberQRData {
  memberId: string;
  name: string;
  phone: string;
}

export class QRService {
  private static bucketName = 'produkimg';
  private static folderName = 'QR Code';

  /**
   * Generate QR code untuk member dan upload ke Supabase Storage
   */
  static async generateMemberQR(memberData: MemberQRData): Promise<string> {
    try {
      // Generate QR code data (JSON string)
      const qrData = JSON.stringify({
        memberId: memberData.memberId,
        name: memberData.name,
        phone: memberData.phone,
        timestamp: new Date().toISOString()
      });

      // Generate QR code image
      const qrCodeBuffer = await QRCode.toBuffer(qrData, {
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Upload ke Supabase Storage
      const fileName = `member-${memberData.memberId}.png`;
      const filePath = `${this.folderName}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, qrCodeBuffer, {
          contentType: 'image/png',
          upsert: true // Overwrite jika file sudah ada
        });

      if (error) {
        throw new Error(`Failed to upload QR code: ${error.message}`);
      }

      // Generate custom shortlink URL untuk production
      const shortlinkUrl = `https://app.maujajan.id/qr/${memberData.memberId}`;
      
      return shortlinkUrl;
    } catch (error) {
      console.error('Error generating member QR code:', error);
      throw error;
    }
  }

  /**
   * Dapatkan URL QR code yang sudah ada
   */
  static async getMemberQRUrl(memberId: string): Promise<string | null> {
    try {
      const fileName = `member-${memberId}.png`;
      const filePath = `${this.folderName}/${fileName}`;

      const { data } = await supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      if (data.publicUrl) {
        // Return custom shortlink URL untuk production
        return `https://app.maujajan.id/qr/${memberId}`;
      }

      return null;
    } catch (error) {
      console.error('Error getting member QR URL:', error);
      return null;
    }
  }

  /**
   * Generate atau dapatkan QR code URL (generate jika belum ada)
   */
  static async getOrGenerateMemberQR(memberData: MemberQRData): Promise<string> {
    try {
      // Coba ambil URL yang sudah ada
      const existingUrl = await this.getMemberQRUrl(memberData.memberId);
      if (existingUrl) {
        return existingUrl;
      }

      // Generate QR code baru jika belum ada
      return await this.generateMemberQR(memberData);
    } catch (error) {
      console.error('Error in getOrGenerateMemberQR:', error);
      throw error;
    }
  }

  /**
   * Parse data QR code
   */
  static parseMemberData(qrData: string): MemberQRData | null {
    try {
      const data = JSON.parse(qrData);
      if (data.memberId && data.name && data.phone) {
        return {
          memberId: data.memberId,
          name: data.name,
          phone: data.phone
        };
      }
      return null;
    } catch (error) {
      console.error('Error parsing member QR data:', error);
      return null;
    }
  }
} 