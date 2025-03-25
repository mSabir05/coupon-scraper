'use client';
import PageTemplate from '@/components/PageTemplate';
import { useState } from 'react';

export default function CNNPage() {
  const [cnnLinks, setCnnLinks] = useState('');
  const [status, setStatus] = useState('');

  const startScrapingCNN = async () => {
    const urls = cnnLinks.split('\n')
      .map(url => url.trim())
      .filter(url => url && url.startsWith('https://coupons.cnn.com/'));

    if (urls.length === 0) {
      alert('Please enter valid CNN coupon URLs');
      return;
    }

    setStatus('Scraping started...');

    try {
      const response = await fetch('/api/cnncoupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });

      const result = await response.json();
      if (result.success) {
        setStatus('Scraping completed successfully!');
        const fileName = result.filePath.split('/').pop();
        const downloadUrl = `/${fileName}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(result.error || 'Failed to scrape coupons');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const loadCNNFromJson = async () => {
    try {
      const response = await fetch('cnnCoupons.json');
      const links = await response.json();
      setCnnLinks(links.join('\n'));
      setStatus(`✅ Loaded ${links.length} sample links`);
    } catch (error) {
      setStatus(`❌ Error loading sample links: ${error.message}`);
    }
  };

  return (
    <PageTemplate
      title="CNN Coupon"
      links={cnnLinks}
      setLinks={setCnnLinks}
      status={status}
      onStart={startScrapingCNN}
      onLoadSample={loadCNNFromJson}
      color="bg-green-500"
      placeholder="https://coupons.cnn.com/store1&#10;https://coupons.cnn.com/store2&#10;..."
    />
  );
}