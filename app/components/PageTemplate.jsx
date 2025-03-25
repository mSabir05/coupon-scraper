'use client';

const PageTemplate = ({ 
  title, 
  links, 
  setLinks, 
  status, 
  stats, 
  onStart, 
  onLoadSample, 
  color, 
  placeholder 
}) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className={`${color} text-white p-4 rounded-t-lg`}>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <label className="block mb-2">Enter URLs (one per line)</label>
          <textarea 
            className="w-full p-2 border rounded h-40"
            placeholder={placeholder}
            value={links}
            onChange={(e) => setLinks(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mb-4">
          <button 
            className={`${color} text-white px-4 py-2 rounded hover:opacity-90`} 
            onClick={onStart}
          >
            Start
          </button>
          <button 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" 
            onClick={onLoadSample}
          >
            Load Sample Links
          </button>
        </div>
        <div className="p-2 border rounded">{status}</div>
        {stats && <div className="p-2 border rounded mt-2">{stats}</div>}
      </div>
    </div>
  );
};

export default PageTemplate;