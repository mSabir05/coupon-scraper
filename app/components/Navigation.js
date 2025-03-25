'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <h3 className="text-xl font-bold mb-4">Get Coupons</h3>
      <div className="flex flex-col space-y-2">
        <Link
          href="/honey"
          className={`p-2 text-left rounded ${
            pathname === '/honey' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
          }`}
        >
          Honey Coupons
        </Link>
        <Link
          href="/cnn"
          className={`p-2 text-left rounded ${
            pathname === '/cnn' ? 'bg-green-500 text-white' : 'hover:bg-gray-100'
          }`}
        >
          CNN Coupons
        </Link>
        <Link
          href="/groupon"
          className={`p-2 text-left rounded ${
            pathname === '/groupon' ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'
          }`}
        >
          Groupon Coupons
        </Link>
      </div>
    </>
  );
}