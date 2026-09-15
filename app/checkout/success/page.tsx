import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-black tracking-tight">ORDER RECEIVED!</h1>
        
        <div className="bg-neutral-900/60 p-6 rounded-xl border border-neutral-800 space-y-4 text-sm text-neutral-300">
          <p>
            Thank you for ordering from <span className="font-bold text-white">LAZAROPH v2</span>.
          </p>
          <p className="px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white font-medium">
            Status: PENDING VERIFICATION
          </p>
          <p>
            We have securely received your order and proof of payment. Our admin team will manually verify your payment within the next 24 hours. 
          </p>
          <p>
            Once confirmed, we will notify you and process your items for immediate shipping via your chosen courier.
          </p>
        </div>

        <div className="pt-6">
          <Link href="/shop" className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-lg hover:bg-neutral-200 transition-colors inline-block">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
