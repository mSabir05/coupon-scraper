'use client';
import PageTemplate from '@/components/PageTemplate';
import { useState } from 'react';


export default function HoneyPage() {
  const [bulkLinks, setBulkLinks] = useState('');
  const [status, setStatus] = useState('');

  const startScraping = async () => {
    const links = bulkLinks
      .split(/[\n\s]+/)
      .map(link => link.trim())
      .filter(link => link && link.startsWith('https://www.joinhoney.com/shop/'));

    if (links.length === 0) {
      alert('Please add at least one valid Honey link');
      return;
    }

    setStatus(`Found ${links.length} valid links\nStarting scraping process...`);

    try {
      const response = await fetch('/scrape-honey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links })
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus(prev => `${prev}\n✅ Scraping completed! (Total coupons: ${data.totalCoupons})`);
      } else {
        setStatus(prev => `${prev}\n❌ Error: ${data.error}`);
      }
    } catch (error) {
      setStatus(prev => `${prev}\n❌ Error: ${error.message}`);
    }
  };

  const loadFromJson = async () => {
    try {
      const response = await fetch('honeylinks.json');
      const links = await response.json();
      setBulkLinks(links.join('\n'));
      setStatus(`✅ Loaded ${links.length} sample links`);
    } catch (error) {
      setStatus(`❌ Error loading sample links: ${error.message}`);
    }
  };

  return (
    <PageTemplate
      title="Join Honey Coupon"
      links={bulkLinks}
      setLinks={setBulkLinks}
      status={status}
      onStart={startScraping}
      onLoadSample={loadFromJson}
      color="bg-blue-500"
      placeholder="Please Paste Your Join Honey Links Here"
    />
  );
}