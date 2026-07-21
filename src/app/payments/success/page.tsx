export const dynamic = 'force-dynamic';

import Link from "next/link";
import { CheckCircle, ArrowRight, Home } from "lucide-react";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const orderId = typeof searchParams.order_id === 'string' ? searchParams.order_id : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-xl border border-green-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Оплата прошла успешно!</h1>
        <p className="text-gray-600 mb-2">
          Спасибо за покупку. Доступ к курсу или абонементу уже активирован.
        </p>
        {orderId && <p className="text-sm text-gray-400 mb-6">ID заказа: {orderId}</p>}
        
        <div className="space-y-3">
          <Link 
            href="/schedule" 
            className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            Перейти к расписанию
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link 
            href="/" 
            className="w-full px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}