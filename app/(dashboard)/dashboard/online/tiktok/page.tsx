import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer } from 'lucide-react';

export default function TiktokShopPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Card className="border-dashed border-2 border-orange-200 bg-orange-50/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Hammer className="w-8 h-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            TIKTOK SHOP
          </CardTitle>
          <CardDescription className="text-base">
            Integrasi TikTok Shop sedang dalam tahap pengembangan.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pt-4 pb-10">
          <p className="text-gray-600 font-medium">
            🚧 Menu ini sedang di-develop oleh <span className="text-orange-600 font-bold">ence</span> 🚧
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Nantikan update selanjutnya ya! Mohon bersabar sementara fitur canggih ini disiapkan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
