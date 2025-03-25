'use client';
import PageTemplate from '@/components/PageTemplate';
import { useState } from 'react';


export default function GrouponPage() {
  const [grouponLinks, setGrouponLinks] = useState('');
  const [status, setStatus] = useState('');
  const [stats, setStats] = useState('');

  const startScrapingGroupon = async () => {
    setStatus('Scraping in progress...');

    try {
      const urls = grouponLinks
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && url.startsWith('https://www.groupon.com/coupons/'));

      if (urls.length === 0) {
        throw new Error('Please enter valid Groupon coupon URLs');
      }

      const response = await fetch('/api/groupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('Scraping completed successfully!');
        setStats(`Total coupons: ${data.totalCoupons || 0}, New coupons: ${data.newCouponsAdded || 0}`);
        
        const fileName = data.fileName || 'coupons_groupon.xlsx';
        const downloadUrl = `/${fileName}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(data.error || 'Failed to scrape coupons');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const loadGrouponFromJson = async () => {
    try {
      const response = await fetch('grouponlinks.json');
      const links = await response.json();
      setGrouponLinks(links.join('\n'));
      setStatus(`✅ Loaded ${links.length} sample links`);
    } catch (error) {
      setStatus(`❌ Error loading sample links: ${error.message}`);
    }
  };

  return (
    <PageTemplate
      title="Groupon Coupon"
      links={grouponLinks}
      setLinks={setGrouponLinks}
      status={status}
      stats={stats}
      onStart={startScrapingGroupon}
      onLoadSample={loadGrouponFromJson}
      color="bg-cyan-500"
      placeholder="https://www.groupon.com/coupons/example"
    />
  );
}